import type { SyncState } from "./SyncState";

export interface Lesson {
  id: number;
  title: string;
  symbol_ids: number[];
  stage: string;
  estimated_minutes: number;
  unlock_rule: string;
  /** 课程内容指纹，symbol_ids/标题等变化后重算，用于判定旧会话失效 */
  content_hash: string;
  /** 乐观锁版本号，并发保存冲突时进入冲突队列 */
  revision: number;
  sync_state: SyncState;
  updated_at: string;
}
