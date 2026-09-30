export interface PracticeSession {
  id: number;
  lesson_id: number;
  mode: string;
  started_at: string;
  finished_at: string;
  score: number;
  mistake_count: number;
  // —— 同步元数据（历史数据可能缺失，迁移服务回填）——
  /** 全局幂等键，远端据此去重，不依赖本地自增 id */
  client_id?: string;
  sync_status?: import("./sync").SyncStatus;
  /** 开始练习时课程的内容指纹；课程变更后据此判定本会话失效 */
  lesson_version?: string;
  /** 课程内容已变更，本会话成绩已被重算/失效 */
  stale?: boolean;
  updated_at?: string;
}
