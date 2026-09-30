import { useEffect } from "react";
import { useSyncStore } from "../stores/syncStore";

/**
 * 待同步队列状态。
 * 页面用它显示"待同步 N · 冲突 M · 失败 K"，并驱动同步横幅与练习门禁。
 */
export function useSyncQueue() {
  const outbox = useSyncStore((s) => s.outbox);
  const counts = useSyncStore((s) => s.counts);
  const syncing = useSyncStore((s) => s.syncing);
  const loadOutbox = useSyncStore((s) => s.loadOutbox);

  useEffect(() => {
    void loadOutbox();
  }, [loadOutbox]);

  return {
    outbox,
    counts,
    syncing,
    hasPending: counts.pending > 0,
    hasConflict: counts.conflict > 0,
    hasFailed: counts.failed > 0,
    needsAttention: counts.conflict > 0 || counts.failed > 0,
    refresh: loadOutbox
  };
}
