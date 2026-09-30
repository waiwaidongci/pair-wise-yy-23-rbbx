import type { EntityName } from "./EntityName";
import type { ConflictStatus } from "./ConflictStatus";

/** 同步冲突（如两个标签页基于同一 revision 改了同一课程） */
export interface SyncConflict {
  id: string;
  entity: EntityName;
  entity_id: number;
  entity_uid?: string;
  local_payload: string;
  remote_payload: string;
  error_code: string;
  reason: string;
  status: ConflictStatus;
  created_at: string;
  resolved_at: string;
}
