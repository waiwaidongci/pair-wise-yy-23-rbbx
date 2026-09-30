import type { SyncState } from "./SyncState";

export interface AnswerRecord {
  id: number;
  session_id: number;
  symbol_id: number;
  user_answer: string;
  correct: boolean;
  latency_ms: number;
  mistake_reason: string;
  /** 所属会话的全局标识，重复同步时服务端按它 + record_uid 只收一次 */
  session_uid: string;
  /** 单条答题记录的幂等键，合并两个标签页的会话时按它去重 */
  record_uid: string;
  answered_at: string;
  sync_state: SyncState;
  updated_at: string;
}
