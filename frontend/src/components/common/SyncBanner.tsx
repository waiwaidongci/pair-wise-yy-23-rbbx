import { useSyncQueue } from "../../hooks/useSyncQueue";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";

/**
 * 顶部同步横幅。
 * 离线或队列有待同步/冲突/失败时显示，点击跳转同步中心处理。
 */
export function SyncBanner({ onNavigate }: { onNavigate: (route: string) => void }) {
  const { online } = useOnlineStatus();
  const { counts, syncing } = useSyncQueue();

  const showOffline = !online;
  const showQueue = counts.total > 0;

  if (!showOffline && !showQueue) return null;

  const parts: string[] = [];
  if (showOffline) parts.push("当前离线");
  if (counts.pending > 0) parts.push(`待同步 ${counts.pending}`);
  if (counts.conflict > 0) parts.push(`冲突 ${counts.conflict}`);
  if (counts.failed > 0) parts.push(`失败 ${counts.failed}`);

  const level = counts.conflict > 0 || counts.failed > 0 ? "alert" : showOffline ? "offline" : "info";

  return (
    <div className={`sync-banner ${level}`} role="status">
      <span className="sync-banner-dot" />
      <span className="sync-banner-text">
        {syncing ? "正在同步…" : parts.join(" · ")}
        {showOffline && "（联网后自动合并）"}
      </span>
      <button className="sync-banner-action" onClick={() => onNavigate("/sync")}>
        前往同步中心 →
      </button>
    </div>
  );
}
