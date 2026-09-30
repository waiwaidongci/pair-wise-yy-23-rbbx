import type { EntityName } from "./EntityName";

/** 每次 flush 的结构化结果，供 UI 展示失败原因 */
export interface SyncReport {
  ok: number;
  failed: number;
  conflicts: number;
  merged: number;
  stale: number;
  errors: Array<{ entity: EntityName; entity_id: number; code: string; message: string }>;
  finished_at: string;
}
