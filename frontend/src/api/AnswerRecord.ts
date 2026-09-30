import { STORES, getAll, put } from "../db";
import type { AnswerRecord } from "../types/AnswerRecord";
import { SYNC_STATUS, ENTITY_TYPE } from "../types/sync";
import { enqueue } from "../services/outboxService";
import { withSyncMeta } from "../constructors/SyncConstructor";
import { LOG_TEMPLATES } from "../constants/logTemplates";

const endpoint = "/api/answer-record";

export async function listAnswerRecord(): Promise<AnswerRecord[]> {
  if (typeof fetch !== "undefined" && endpoint.startsWith("/api") && false) {
    try {
      const res = await fetch(endpoint);
      if (res.ok) return await res.json();
    } catch {
      // 本地 IndexedDB 兜底
    }
  }
  return getAll<AnswerRecord>(STORES.ANSWER_RECORDS);
}

/**
 * 保存答题记录：写本地 → 入队同步。
 * 两条记录即使 session 相同也各有 client_id，远端按 client_id 取并集，
 * 因此两个标签页的答题记录都会保留，不会被会话盖掉。
 */
export async function saveAnswerRecord(payload: AnswerRecord): Promise<AnswerRecord> {
  const isNew = !payload.id;
  if (isNew) {
    const rows = await getAll<AnswerRecord>(STORES.ANSWER_RECORDS);
    payload.id = rows.reduce((max, r) => Math.max(max, r.id), 0) + 1;
  }

  const toSave = withSyncMeta(payload, SYNC_STATUS.PENDING);
  await put(STORES.ANSWER_RECORDS, toSave);
  console.info(`[AnswerRecord] ${LOG_TEMPLATES.AnswerRecord[0]}：#${toSave.id}（client=${toSave.client_id}）`);

  await enqueue({ entity_type: ENTITY_TYPE.ANSWER_RECORD, payload: toSave, client_id: toSave.client_id });
  return toSave;
}
