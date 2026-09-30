import type { SyncState } from "../types/SyncState";
import type { OutboxState } from "../types/OutboxState";
import type { ConflictStatus } from "../types/ConflictStatus";

export const SyncStateValues: readonly SyncState[] = ["NEW_LOCAL", "PENDING", "SYNCED", "CONFLICT", "STALE"];
export const OutboxStateValues: readonly OutboxState[] = ["QUEUED", "IN_FLIGHT", "FAILED", "CONFLICT"];
export const ConflictStatusValues: readonly ConflictStatus[] = ["OPEN", "RESOLVED_LOCAL", "RESOLVED_REMOTE"];

export const SyncStateText: Record<SyncState, string> = {
  NEW_LOCAL: "本地新建",
  PENDING: "待同步",
  SYNCED: "已同步",
  CONFLICT: "冲突",
  STALE: "已失效"
};

export const OutboxStateText: Record<OutboxState, string> = {
  QUEUED: "排队中",
  IN_FLIGHT: "同步中",
  FAILED: "同步失败",
  CONFLICT: "冲突待处理"
};

export const ConflictStatusText: Record<ConflictStatus, string> = {
  OPEN: "待处理",
  RESOLVED_LOCAL: "保留本地",
  RESOLVED_REMOTE: "采用远端"
};
