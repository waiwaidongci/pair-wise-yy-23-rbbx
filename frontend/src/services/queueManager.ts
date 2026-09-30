import { SYNC_CONFIG } from "../constants/syncConfig";
import { idbGet, idbPut, type StoreName } from "./db";
import { createOutboxItem } from "./sync/outboxFactory";
import type { EntityName } from "../types/EntityName";
import type { SyncOutboxItem } from "../types/SyncOutboxItem";

async function nextOutboxSeq(): Promise<number> {
  const meta = await idbGet("meta", SYNC_CONFIG.metaKeys.flushSeq);
  const next = (meta ? Number(meta.value) : 0) + 1;
  await idbPut("meta", { key: SYNC_CONFIG.metaKeys.flushSeq, value: String(next) });
  return next;
}

/** 写操作统一入队；flush 断点续传时按 seq 顺序消费 */
export async function enqueueSave(input: {
  entity: EntityName;
  entity_id: number;
  entity_uid?: string;
  payload: unknown;
  force?: boolean;
}): Promise<SyncOutboxItem> {
  const seq = await nextOutboxSeq();
  return createOutboxItem({ ...input, seq });
}

export function isTemporaryId(id: number): boolean {
  return id < 0;
}

/** 本地新建实体使用负数临时 id，与服务端权威正数 id 区分，回传后按 uid 换号 */
const tempIdKeys: Record<Exclude<StoreName, "outbox" | "conflicts" | "meta">, string> = {
  brailleSymbol: "tempId:brailleSymbol",
  lesson: "tempId:lesson",
  practiceSession: "tempId:practiceSession",
  answerRecord: "tempId:answerRecord"
};

export async function nextTemporaryId(store: Exclude<StoreName, "outbox" | "conflicts" | "meta">): Promise<number> {
  const key = tempIdKeys[store];
  const meta = await idbGet("meta", key);
  const next = meta ? Number(meta.value) - 1 : -1;
  await idbPut("meta", { key, value: String(next) });
  return next;
}
