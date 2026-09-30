import type { ReactNode } from "react";
import { useSyncQueue } from "../../hooks/useSyncQueue";

/**
 * 练习门禁。
 * 有未处理的冲突或失败时，阻止进入练习——"处理完再练习"。
 * 待同步（pending）不拦截：离线本来就该继续作答，联网后自动同步。
 */
export function SyncGate({
  children,
  onNavigate
}: {
  children: ReactNode;
  onNavigate: (route: string) => void;
}) {
  const { hasConflict, hasFailed, counts } = useSyncQueue();

  if (!hasConflict && !hasFailed) {
    return <>{children}</>;
  }

  return (
    <div className="sync-gate">
      <div className="sync-gate-card">
        <p className="eyebrow">处理完再练习</p>
        <h2>还有同步问题未解决</h2>
        <p className="sync-gate-desc">
          {hasConflict && <>检测到 <strong>{counts.conflict}</strong> 条同步冲突，</>}
          {hasFailed && <> <strong>{counts.failed}</strong> 条同步失败，</>}
          请先到同步中心处理，再开始练习，避免成绩被覆盖。
        </p>
        <div className="sync-gate-actions">
          <button className="primary" onClick={() => onNavigate("/sync")}>
            前往同步中心处理
          </button>
        </div>
      </div>
    </div>
  );
}
