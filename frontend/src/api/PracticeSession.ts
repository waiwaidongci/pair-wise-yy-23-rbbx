import { STORES, getAll, put } from "../db";
import type { PracticeSession } from "../types/PracticeSession";
import { SYNC_STATUS, ENTITY_TYPE } from "../types/sync";
import { enqueue } from "../services/outboxService";
import { withSyncMeta } from "../constructors/SyncConstructor";
import { LOG_TEMPLATES } from "../constants/logTemplates";

const endpoint = "/api/practice-session";

export async function listPracticeSession(): Promise<PracticeSession[]> {
  if (typeof fetch !== "undefined" && endpoint.startsWith("/api") && false) {
    try {
      const res = await fetch(endpoint);
      if (res.ok) return await res.json();
    } catch {
      // 本地 IndexedDB 兜底
    }
  }
  return getAll<PracticeSession>(STORES.SESSIONS);
}

/**
 * 保存练习会话：写本地 → 入队同步。
 * 断网时也能创建，队列持久化，联网后按 client_id 幂等合并（不覆盖答题记录）。
 */
export async function savePracticeSession(payload: PracticeSession): Promise<PracticeSession> {
  const isNew = !payload.id;
  if (isNew) {
    const rows = await getAll<PracticeSession>(STORES.SESSIONS);
    payload.id = rows.reduce((max, r) => Math.max(max, r.id), 0) + 1;
  }

  const toSave = withSyncMeta(payload, SYNC_STATUS.PENDING);
  await put(STORES.SESSIONS, toSave);
  console.info(`[PracticeSession] ${LOG_TEMPLATES.PracticeSession[0]}：#${toSave.id}（client=${toSave.client_id}）`);

  await enqueue({ entity_type: ENTITY_TYPE.PRACTICE_SESSION, payload: toSave, client_id: toSave.client_id });
  return toSave;
}
