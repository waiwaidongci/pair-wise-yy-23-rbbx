export interface Lesson {
  id: number;
  title: string;
  symbol_ids: number[];
  stage: string;
  estimated_minutes: number;
  unlock_rule: string;
  /** 课程内容指纹：symbol_ids(+标题)变化即变，用于判定旧会话/进度失效 */
  content_hash?: string;
  // —— 同步元数据（历史数据可能缺失，迁移服务回填）——
  client_id?: string;
  sync_status?: import("./sync").SyncStatus;
  updated_at?: string;
}
