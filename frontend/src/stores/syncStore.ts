import { create } from "zustand";
import type { OutboxItem, SyncConflict } from "../types/sync";
import {
  listOutbox,
  countByStatus,
  type OutboxCounts
} from "../services/outboxService";
import {
  syncNow,
  resolveConflict as resolveConflictService,
  retryFailed as retryFailedService,
  pullMerge,
  type SyncOutcome
} from "../services/syncService";
import { setSimulateFailure } from "../api/sync";

interface SyncState {
  outbox: OutboxItem[];
  counts: OutboxCounts;
  online: boolean;
  syncing: boolean;
  lastOutcome: SyncOutcome | null;
  lastError: string | null;
  simulateFailure: boolean;

  loadOutbox: () => Promise<void>;
  setOnline: (online: boolean) => void;
  setSimulateFailure: (value: boolean) => void;
  sync: () => Promise<SyncOutcome>;
  retryFailed: () => Promise<void>;
  resolveConflict: (clientId: string, action: "discard" | "keep-local" | "accept-remote") => Promise<void>;
  pull: () => Promise<void>;
}

const EMPTY_COUNTS: OutboxCounts = { pending: 0, synced: 0, conflict: 0, failed: 0, total: 0 };

export const useSyncStore = create<SyncState>((set, get) => ({
  outbox: [],
  counts: EMPTY_COUNTS,
  online: typeof navigator !== "undefined" ? navigator.onLine : true,
  syncing: false,
  lastOutcome: null,
  lastError: null,
  simulateFailure: false,

  async loadOutbox() {
    const items = await listOutbox();
    set({ outbox: items, counts: countByStatus(items) });
  },

  setOnline(online) {
    set({ online });
  },

  setSimulateFailure(value) {
    setSimulateFailure(value);
    set({ simulateFailure: value });
  },

  async sync() {
    if (get().syncing) return { synced: 0, conflicts: [], failed: 0, resumed_from: 0 };
    set({ syncing: true, lastError: null });
    try {
      const outcome = await syncNow();
      set({ lastOutcome: outcome });
      await get().loadOutbox();
      return outcome;
    } catch (err) {
      const message = err instanceof Error ? err.message : "同步失败";
      set({ lastError: message });
      await get().loadOutbox();
      return { synced: 0, conflicts: [], failed: 1, resumed_from: 0 };
    } finally {
      set({ syncing: false });
    }
  },

  async retryFailed() {
    set({ syncing: true, lastError: null });
    try {
      const outcome = await retryFailedService();
      set({ lastOutcome: outcome });
      await get().loadOutbox();
    } finally {
      set({ syncing: false });
    }
  },

  async resolveConflict(clientId, action) {
    await resolveConflictService(clientId, action);
    await get().loadOutbox();
  },

  async pull() {
    await pullMerge();
    await get().loadOutbox();
  }
}));

/** 从 outbox 项中提取冲突对象（供页面展示） */
export function conflictsFromOutbox(items: OutboxItem[]): SyncConflict[] {
  return items
    .filter((it) => it.status === "CONFLICT")
    .map((it) => ({
      client_id: it.client_id,
      entity_type: it.entity_type,
      reason: it.conflict_reason ?? "IDEMPOTENT_MISMATCH",
      message: it.last_error ?? "同步冲突",
      local_payload: it.payload,
      remote_payload: null,
      detected_at: it.updated_at
    }));
}
