import { create } from "zustand";
import { subscribeOnlineChange } from "../api/server/network";
import { idbGetAll } from "../services/db";
import { bootstrapLocalDatabase } from "../services/bootstrap";
import { conflictService } from "../services/conflictService";
import { syncEngine } from "../services/sync/syncEngine";
import type { SyncConflict } from "../types/SyncConflict";
import type { SyncOutboxItem } from "../types/SyncOutboxItem";
import type { SyncReport } from "../types/SyncReport";
import { logError } from "../utils/logger";

type SyncStatusState = {
  ready: boolean;
  online: boolean;
  flushing: boolean;
  migrated: number;
  queue: SyncOutboxItem[];
  conflicts: SyncConflict[];
  lastReport: SyncReport | null;
  init: () => Promise<void>;
  flush: () => Promise<void>;
  refresh: () => Promise<void>;
  resolveConflict: (id: string, resolution: "LOCAL" | "REMOTE") => Promise<void>;
};

async function readStatus() {
  const queue = (await idbGetAll("outbox")).sort((a, b) => a.seq - b.seq);
  const conflicts = await conflictService.listOpen();
  return { queue, conflicts };
}

export const useSyncStore = create<SyncStatusState>((set, get) => ({
  ready: false,
  online: typeof navigator !== "undefined" ? navigator.onLine : true,
  flushing: false,
  migrated: 0,
  queue: [],
  conflicts: [],
  lastReport: null,

  async init() {
    if (get().ready) return;
    const { migrated } = await bootstrapLocalDatabase();
    set({ ready: true, migrated, online: navigator.onLine });
    await get().refresh();
    if (navigator.onLine) await get().flush();

    // 回网自动续传；其他标签页完成同步后通过 storage 事件刷新本页视图
    subscribeOnlineChange((online) => {
      set({ online });
      if (online) void get().flush();
    });
    window.addEventListener("storage", (event) => {
      if (event.key === "braille-trainer:mock-server" || event.key === "braille-trainer:queue-tick") {
        void get().refresh();
      }
    });
  },

  async flush() {
    if (get().flushing) return;
    set({ flushing: true });
    try {
      const lastReport = await syncEngine.flush();
      await get().refresh();
      set({ lastReport });
      // 通知同一浏览器其他标签页：服务端状态已变化，请刷新合并结果
      localStorage.setItem("braille-trainer:queue-tick", new Date().toISOString());
    } catch (error) {
      logError("SYNC_WRITE_FAILED", error instanceof Error ? error.message : String(error));
    } finally {
      set({ flushing: false });
    }
  },

  async refresh() {
    set(await readStatus());
  },

  async resolveConflict(id, resolution) {
    await conflictService.resolve(id, resolution);
    await get().refresh();
  }
}));
