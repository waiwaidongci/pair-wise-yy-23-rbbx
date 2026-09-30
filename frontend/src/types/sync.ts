/**
 * 离线同步领域模型。
 *
 * 设计背景（断网课堂场景）：
 * 两个标签页在断网状态下各自完成同一课程，回网时练习会话会盖掉先写的答题记录。
 * 因此所有写操作先进入本地 outbox（IndexedDB），联网后按 client_id 幂等合并，
 * 重复同步只收一次；课程内容变化后旧会话/进度通过 content_hash 判定失效并重算。
 */

/** 同步状态：待同步 / 已同步 / 冲突 / 失败 */
export const SYNC_STATUS = {
  PENDING: "PENDING",
  SYNCED: "SYNCED",
  CONFLICT: "CONFLICT",
  FAILED: "FAILED"
} as const;
export type SyncStatus = (typeof SYNC_STATUS)[keyof typeof SYNC_STATUS];

/** 纳入离线同步流程的实体类型 */
export const ENTITY_TYPE = {
  LESSON: "Lesson",
  PRACTICE_SESSION: "PracticeSession",
  ANSWER_RECORD: "AnswerRecord"
} as const;
export type EntityType = (typeof ENTITY_TYPE)[keyof typeof ENTITY_TYPE];

/** 冲突原因 */
export const CONFLICT_REASON = {
  /** 同一 client_id 收到两份不同载荷（幂等键冲突） */
  IDEMPOTENT_MISMATCH: "IDEMPOTENT_MISMATCH",
  /** 课程内容已变更，旧练习版本失效 */
  LESSON_VERSION_STALE: "LESSON_VERSION_STALE",
  /** 远端已删除该记录 */
  REMOTE_DELETED: "REMOTE_DELETED"
} as const;
export type ConflictReason = (typeof CONFLICT_REASON)[keyof typeof CONFLICT_REASON];

/** 所有可离线同步实体的公共元数据（历史数据可能缺失，由迁移服务回填） */
export interface SyncMeta {
  /** 全局幂等键（客户端生成），远端据此去重，不用本地自增 id 做身份 */
  client_id: string;
  sync_status: SyncStatus;
  updated_at: string;
}

/** outbox 队列项：一次待同步的写入 */
export interface OutboxItem {
  id?: number;
  client_id: string;
  entity_type: EntityType;
  payload: unknown;
  op: "upsert";
  status: SyncStatus;
  retry_count: number;
  last_error: string | null;
  conflict_reason: ConflictReason | null;
  created_at: string;
  updated_at: string;
}

/** 同步检查点：断点续传，记录已处理到的 outbox 位置 */
export interface SyncCheckpoint {
  last_processed_outbox_id: number;
  updated_at: string;
}

/** 同步过程中发现的冲突 */
export interface SyncConflict {
  client_id: string;
  entity_type: EntityType;
  reason: ConflictReason;
  message: string;
  local_payload: unknown;
  remote_payload: unknown;
  detected_at: string;
}

/** 远端同步接口返回 */
export interface RemoteSyncResponse {
  /** 本次被接受（含幂等去重）的 client_id 列表 */
  accepted: string[];
  conflicts: SyncConflict[];
  server_lessons: import("./Lesson").Lesson[];
  server_sessions: import("./PracticeSession").PracticeSession[];
  server_answer_records: import("./AnswerRecord").AnswerRecord[];
}

/** 本地迁移状态（记录在 meta 表，迁移幂等） */
export interface MigrationState {
  version: number;
  migrated_at: string;
  legacy_backfilled: number;
}
