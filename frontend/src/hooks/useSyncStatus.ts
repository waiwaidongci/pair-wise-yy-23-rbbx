import { useEffect } from "react";
import { useSyncStore } from "../stores/SyncStore";

/** 页面挂载时确保同步引擎已引导，并订阅队列/冲突变化供状态栏展示 */
export function useSyncStatus() {
  const ready = useSyncStore((state) => state.ready);
  const online = useSyncStore((state) => state.online);
  const flushing = useSyncStore((state) => state.flushing);
  const queue = useSyncStore((state) => state.queue);
  const conflicts = useSyncStore((state) => state.conflicts);
  const lastReport = useSyncStore((state) => state.lastReport);
  const migrated = useSyncStore((state) => state.migrated);
  const init = useSyncStore((state) => state.init);
  const flush = useSyncStore((state) => state.flush);
  const refresh = useSyncStore((state) => state.refresh);

  useEffect(() => {
    if (!ready) void init();
  }, [ready, init]);

  const pending = queue.filter((item) => item.state === "QUEUED" || item.state === "IN_FLIGHT").length;
  const failed = queue.filter((item) => item.state === "FAILED").length;

  return {
    ready,
    online,
    flushing,
    pending,
    failed,
    queue,
    conflicts,
    conflictCount: conflicts.length,
    lastReport,
    migrated,
    flush,
    refresh,
    /** 有失败或冲突时必须先处理完才能开始新练习 */
    blocked: failed > 0 || conflicts.length > 0
  };
}
