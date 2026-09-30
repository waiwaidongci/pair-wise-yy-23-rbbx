import { idbPutEntityWithOutbox } from "./db";
import { enqueueSave } from "./queueManager";
import { hashLessonContent } from "../utils/hash";
import { logOperation } from "../utils/logger";
import type { Lesson } from "../types/Lesson";

/**
 * 课程编辑：内容变化后重算 content_hash 并让 revision +1。
 * 服务端若发现该 revision 已被其他标签页抢先提交，会回 VERSION_CONFLICT 进入冲突处理。
 */
export const lessonService = {
  async updateContent(current: Lesson, patch: Partial<Pick<Lesson, "title" | "symbol_ids" | "stage" | "estimated_minutes" | "unlock_rule">>): Promise<Lesson> {
    const next: Lesson = {
      ...current,
      ...patch,
      content_hash: hashLessonContent({ ...current, ...patch }),
      // 乐观锁：提交基线 revision，由服务端权威 +1；基于旧基线的并发保存会收到 VERSION_CONFLICT
      revision: current.revision,
      sync_state: "PENDING",
      updated_at: new Date().toISOString()
    };
    const outbox = await enqueueSave({
      entity: "Lesson",
      entity_id: next.id,
      entity_uid: String(next.id),
      payload: next
    });
    await idbPutEntityWithOutbox("lesson", next, outbox);
    logOperation("Lesson", 1, { lesson_id: next.id, revision: next.revision });
    return next;
  }
};
