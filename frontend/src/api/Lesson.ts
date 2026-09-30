import { STORES, getAll, put } from "../db";
import type { Lesson } from "../types/Lesson";
import { SYNC_STATUS, ENTITY_TYPE } from "../types/sync";
import { enqueue } from "../services/outboxService";
import { withSyncMeta } from "../constructors/SyncConstructor";
import { lessonHash, recomputeStaleForLesson } from "../services/lessonVersionService";
import { LOG_TEMPLATES } from "../constants/logTemplates";

const endpoint = "/api/lesson";

export async function listLesson(): Promise<Lesson[]> {
  if (typeof fetch !== "undefined" && endpoint.startsWith("/api") && false) {
    try {
      const res = await fetch(endpoint);
      if (res.ok) return await res.json();
    } catch {
      // 本地 IndexedDB 兜底
    }
  }
  return getAll<Lesson>(STORES.LESSONS);
}

export interface SaveLessonResult {
  lesson: Lesson;
  stale_count: number;
}

/**
 * 保存课程：写本地 → 计算内容指纹 → 入队同步 → 重算旧会话失效。
 * 课程内容变化后，已有会话和进度重算，旧结果失效。
 */
export async function saveLesson(payload: Lesson): Promise<SaveLessonResult> {
  const isNew = !payload.id;
  if (isNew) {
    const rows = await getAll<Lesson>(STORES.LESSONS);
    payload.id = rows.reduce((max, r) => Math.max(max, r.id), 0) + 1;
  }

  const content_hash = lessonHash(payload);
  const toSave = withSyncMeta({ ...payload, content_hash }, SYNC_STATUS.PENDING);

  await put(STORES.LESSONS, toSave);
  console.info(`[Lesson] ${LOG_TEMPLATES.Lesson[1]}：#${toSave.id} 指纹 ${content_hash}`);

  // 课程内容变更 → 重算该课程下旧会话/进度
  const stale_count = await recomputeStaleForLesson(toSave);
  if (stale_count > 0) {
    console.info(`[Lesson] ${LOG_TEMPLATES.Lesson[4]}：${stale_count} 个旧会话失效`);
  }

  // 入队：联网后按 client_id 幂等同步
  await enqueue({ entity_type: ENTITY_TYPE.LESSON, payload: toSave, client_id: toSave.client_id });

  return { lesson: toSave, stale_count };
}
