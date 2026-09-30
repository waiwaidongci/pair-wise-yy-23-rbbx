export interface AnswerRecord {
  id: number;
  session_id: number;
  /** 会话的全局幂等键，跨标签页/远端用它关联会话，而非本地自增 id */
  session_client_id?: string;
  symbol_id: number;
  user_answer: string;
  correct: boolean;
  latency_ms: number;
  mistake_reason: string | null;
  // —— 同步元数据（历史数据可能缺失，迁移服务回填）——
  client_id?: string;
  sync_status?: import("./sync").SyncStatus;
  /** 作答时课程的内容指纹，随会话一起失效 */
  lesson_version?: string;
  /** 课程内容已变更，本记录随旧成绩失效 */
  stale?: boolean;
  updated_at?: string;
}
