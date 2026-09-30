import { useSyncStatus } from "../../hooks/useSyncStatus";
import { formatFailureReason } from "../../utils/formatters";

/** 全局同步状态条：在线状态、待同步数、冲突、写入失败原因；处理完再练习的入口也在这里 */
export function SyncStatusBar() {
  const status = useSyncStatus();
  const failedItems = status.queue.filter((item) => item.state === "FAILED");

  return (
    <div className="sync-bar" aria-live="polite">
      <div className="sync-chip-group">
        <span className={"sync-chip " + (status.online ? "online" : "offline")}>
          {status.online ? "在线" : "断网中（可继续作答）"}
        </span>
        <span className="sync-chip">待同步 {status.pending}</span>
        <span className={"sync-chip " + (status.conflictCount > 0 ? "danger" : "")}>冲突 {status.conflictCount}</span>
        <span className={"sync-chip " + (status.failed > 0 ? "danger" : "")}>失败 {status.failed}</span>
        {status.migrated > 0 ? <span className="sync-chip warn">已兼容迁移 {status.migrated} 条历史数据</span> : null}
        {status.flushing ? <span className="sync-chip">同步中…</span> : null}
      </div>
      <div className="sync-actions">
        {failedItems.length > 0 ? (
          <ul className="sync-errors">
            {failedItems.slice(0, 3).map((item) => (
              <li key={item.op_id} className="sync-error">
                {item.entity} #{item.entity_id}：{formatFailureReason(item.last_error_code, item.last_error_message)}
              </li>
            ))}
          </ul>
        ) : null}
        <button
          className="sync-button"
          onClick={() => void status.flush()}
          disabled={!status.online || status.flushing || (status.pending === 0 && status.failed === 0)}
        >
          立即同步 / 断点续传
        </button>
      </div>
    </div>
  );
}
