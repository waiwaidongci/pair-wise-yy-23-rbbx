import { SYNC_STATUS, CONFLICT_REASON, ENTITY_TYPE } from "../types/sync";
import type { SyncStatus, ConflictReason, EntityType } from "../types/sync";

export { SYNC_STATUS, CONFLICT_REASON, ENTITY_TYPE };
export type { SyncStatus, ConflictReason, EntityType };

/** 同步状态中文案（展示组件/筛选器共用） */
export const SyncStatusText: Record<SyncStatus, string> = {
  PENDING: "待同步",
  SYNCED: "已同步",
  CONFLICT: "冲突",
  FAILED: "失败"
};

/** 冲突原因中文案 */
export const ConflictReasonText: Record<ConflictReason, string> = {
  IDEMPOTENT_MISMATCH: "同一同步标识收到不同内容（幂等冲突）",
  LESSON_VERSION_STALE: "课程内容已更新，旧练习成绩已失效",
  REMOTE_DELETED: "远端已删除该记录"
};

/** 实体类型中文案 */
export const EntityTypeText: Record<EntityType, string> = {
  Lesson: "课程",
  PracticeSession: "练习会话",
  AnswerRecord: "答题记录"
};

/** 可离线同步的实体清单（按依赖顺序：课程 → 会话 → 记录） */
export const SYNC_ENTITY_ORDER: EntityType[] = [
  ENTITY_TYPE.LESSON,
  ENTITY_TYPE.PRACTICE_SESSION,
  ENTITY_TYPE.ANSWER_RECORD
];
