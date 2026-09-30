import type { EntityName } from "../../types/EntityName";
import type { SyncOutboxItem } from "../../types/SyncOutboxItem";
import { createUid } from "../../utils/uid";

export function createOutboxItem(input: {
  entity: EntityName;
  entity_id: number;
  entity_uid?: string;
  payload: unknown;
  force?: boolean;
  seq: number;
  now?: string;
}): SyncOutboxItem {
  const now = input.now ?? new Date().toISOString();
  return {
    op_id: createUid("op"),
    seq: input.seq,
    entity: input.entity,
    entity_id: input.entity_id,
    entity_uid: input.entity_uid,
    op: "SAVE",
    payload: JSON.stringify(input.payload),
    force: input.force ?? false,
    state: "QUEUED",
    attempts: 0,
    last_error_code: "",
    last_error_message: "",
    created_at: now,
    updated_at: now
  };
}
