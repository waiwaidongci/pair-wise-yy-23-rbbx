import {
  SYNC_STATUS,
  ENTITY_TYPE,
  type EntityType,
  type OutboxItem,
  type SyncCheckpoint,
  type SyncConflict,
  type ConflictReason
} from "../types/sync";
import { createClientId } from "../utils/id";

const now = () => new Date().toISOString();

/** 给实体挂同步元数据（新建记录时调用） */
export function withSyncMeta<T extends { client_id?: string; sync_status?: string; updated_at?: string }>(
  entity: T,
  status: (typeof SYNC_STATUS)[keyof typeof SYNC_STATUS] = SYNC_STATUS.PENDING
): T & { client_id: string; sync_status: string; updated_at: string } {
  const client_id = entity.client_id ?? createClientId();
  return { ...entity, client_id, sync_status: status, updated_at: entity.updated_at ?? now() };
}

/** 构造一条待同步的 outbox 队列项 */
export function createOutboxItem(input: {
  entity_type: EntityType;
  payload: unknown;
  client_id?: string;
}): OutboxItem {
  const ts = now();
  const payload = input.payload as { client_id?: string };
  return {
    client_id: input.client_id ?? payload.client_id ?? createClientId(),
    entity_type: input.entity_type,
    payload: input.payload,
    op: "upsert",
    status: SYNC_STATUS.PENDING,
    retry_count: 0,
    last_error: null,
    conflict_reason: null,
    created_at: ts,
    updated_at: ts
  };
}

/** 构造一个同步冲突对象 */
export function createSyncConflict(input: {
  client_id: string;
  entity_type: EntityType;
  reason: ConflictReason;
  message: string;
  local_payload: unknown;
  remote_payload: unknown;
}): SyncConflict {
  return { ...input, detected_at: now() };
}

/** 构造断点续传检查点 */
export function createCheckpoint(last_processed_outbox_id = 0): SyncCheckpoint {
  return { last_processed_outbox_id, updated_at: now() };
}

/** 实体类型 → 中文名（日志/展示用） */
export function entityTypeLabel(entity_type: EntityType): string {
  return ENTITY_TYPE_TEXT[entity_type] ?? entity_type;
}

const ENTITY_TYPE_TEXT: Record<EntityType, string> = {
  [ENTITY_TYPE.LESSON]: "课程",
  [ENTITY_TYPE.PRACTICE_SESSION]: "练习会话",
  [ENTITY_TYPE.ANSWER_RECORD]: "答题记录"
};
