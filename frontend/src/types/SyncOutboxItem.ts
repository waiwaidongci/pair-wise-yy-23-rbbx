import type { EntityName } from "./EntityName";
import type { OutboxState } from "./OutboxState";

/**
 * 待同步写操作。写入失败后整条保留在 IndexedDB 的 outbox 中，
 * flush 从 seq 最小的 QUEUED/FAILED 项继续，实现断点续传。
 */
export interface SyncOutboxItem {
  /** 幂等键：同一操作（含重复入队/重试）服务端只收一次 */
  op_id: string;
  seq: number;
  entity: EntityName;
  /** 实体数字主键 */
  entity_id: number;
  /** 会话/记录的全局标识，服务端按它合并而不是按数字 id 覆盖 */
  entity_uid?: string;
  op: "SAVE";
  payload: string;
  /** 冲突处理选择“保留本地”后置 true，服务端允许以本地版本覆盖远端 */
  force: boolean;
  state: OutboxState;
  attempts: number;
  last_error_code: string;
  last_error_message: string;
  created_at: string;
  updated_at: string;
}
