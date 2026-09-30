import type { SyncState } from "./SyncState";

export interface PracticeSession {
  id: number;
  lesson_id: number;
  lesson_revision: number;
  mode: string;
  started_at: string;
  finished_at: string;
  score: number;
  mistake_count: number;
  /** 客户端生成的全局唯一标识，跨标签页合并答题记录时用于定位会话 */
  session_uid: string;
  /** 会话开始时课程内容的指纹，课程变化后用于判定旧结果失效 */
  content_hash: string;
  sync_state: SyncState;
  updated_at: string;
}
