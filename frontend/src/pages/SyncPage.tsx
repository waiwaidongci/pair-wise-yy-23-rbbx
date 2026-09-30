import { useEffect, useState } from "react";
import { useSyncStore } from "../stores/syncStore";
import { useSyncQueue } from "../hooks/useSyncQueue";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { StatusBadge } from "../components/common/StatusBadge";
import { StatCard } from "../components/common/StatCard";
import { EmptyState } from "../components/common/EmptyState";
import { SyncStatusText, ConflictReasonText, EntityTypeText } from "../constants/syncStatus";
import { formatDate } from "../utils/formatters";
import { runMigration, MIGRATION_VERSION } from "../services/migrationService";
import { getMeta } from "../db";
import type { MigrationState } from "../types/sync";

export function SyncPage() {
  const { online, browserOnline, forcedOffline, setForcedOffline } = useOnlineStatus();
  const { counts, outbox, syncing, loadOutbox, sync, retryFailed, resolveConflict, simulateFailure, setSimulateFailure } =
    useSyncStore();
  const { refresh } = useSyncQueue();
  const [migration, setMigration] = useState<MigrationState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void loadOutbox();
    getMeta<MigrationState>("migration-state").then((s) => setMigration(s ?? null));
  }, [loadOutbox]);

  const handleSync = async () => {
    setBusy(true);
    await sync();
    await refresh();
    setBusy(false);
  };

  const handleRetry = async () => {
    setBusy(true);
    await retryFailed();
    await refresh();
    setBusy(false);
  };

  const handleResolve = async (clientId: string, action: "discard" | "keep-local" | "accept-remote") => {
    setBusy(true);
    await resolveConflict(clientId, action);
    await refresh();
    setBusy(false);
  };

  const handleRerunMigration = async () => {
    setBusy(true);
    const result = await runMigration();
    const state = await getMeta<MigrationState>("migration-state");
    setMigration(state ?? null);
    setBusy(false);
    if (result.migrated) await refresh();
  };

  return (
    <main className="page">
      <section className="page-head">
        <div>
          <p className="eyebrow">离线训练</p>
          <h1>同步中心</h1>
        </div>
        <StatusBadge value={online ? "SYNCED" : "FAILED"} text={online ? "在线" : "离线"} />
      </section>

      <section className="metrics">
        <StatCard label="待同步" value={counts.pending} tone="info" hint="联网后自动合并" />
        <StatCard label="冲突" value={counts.conflict} tone="warn" hint="需人工处理" />
        <StatCard label="失败" value={counts.failed} tone="bad" hint="保留队列可重试" />
        <StatCard label="已同步" value={counts.synced} tone="ok" />
      </section>

      <section className="panel">
        <h2>网络与同步</h2>
        <div className="sync-controls">
          <label className="switch">
            <input
              type="checkbox"
              checked={forcedOffline}
              onChange={(e) => setForcedOffline(e.target.checked)}
            />
            <span>强制离线（模拟断网课堂）</span>
          </label>
          <label className="switch">
            <input
              type="checkbox"
              checked={simulateFailure}
              onChange={(e) => setSimulateFailure(e.target.checked)}
            />
            <span>模拟写入失败（演示断点续传）</span>
          </label>
          <div className="sync-actions">
            <button className="primary" disabled={!online || syncing || busy} onClick={handleSync}>
              {syncing ? "同步中…" : "立即同步"}
            </button>
            {counts.failed > 0 && (
              <button disabled={!online || syncing || busy} onClick={handleRetry}>
                重试失败项
              </button>
            )}
          </div>
        </div>
        <p className="muted">
          浏览器状态：{browserOnline ? "在线" : "离线"} · 当前生效：{online ? "在线" : "离线"}
          {!online && "（离线期间作答会暂存到待同步队列，不会丢失）"}
        </p>
      </section>

      <section className="panel">
        <h2>数据迁移</h2>
        {migration ? (
          <p className="muted">
            迁移版本 v{migration.version} 已完成（{formatDate(migration.migrated_at)}），
            回填历史同步标识 {migration.legacy_backfilled} 条。
          </p>
        ) : (
          <p className="muted">尚未迁移。</p>
        )}
        <button onClick={handleRerunMigration} disabled={busy}>
          重新执行迁移
        </button>
      </section>

      <section className="panel">
        <h2>待同步队列</h2>
        {outbox.length === 0 ? (
          <EmptyState title="队列为空" hint="所有练习记录都已同步" />
        ) : (
          <div className="table">
            {outbox.map((item) => (
              <article key={item.id} className="row sync-row">
                <div className="sync-row-main">
                  <strong>{EntityTypeText[item.entity_type]}</strong>
                  <code className="sync-client-id">{item.client_id.slice(0, 8)}</code>
                  <StatusBadge value={item.status} text={SyncStatusText[item.status]} />
                </div>
                <div className="sync-row-meta">
                  {item.status === "CONFLICT" && item.conflict_reason && (
                    <span className="conflict-reason">
                      {ConflictReasonText[item.conflict_reason] ?? item.conflict_reason}
                    </span>
                  )}
                  {item.status === "FAILED" && item.last_error && (
                    <span className="failure-reason">失败原因：{item.last_error}</span>
                  )}
                  {item.status === "PENDING" && item.retry_count > 0 && (
                    <span className="muted">已重试 {item.retry_count} 次</span>
                  )}
                  {item.status === "SYNCED" && <span className="muted">已合并</span>}
                </div>
                {item.status === "CONFLICT" && (
                  <div className="sync-row-actions">
                    {item.conflict_reason === "LESSON_VERSION_STALE" ? (
                      <>
                        <button className="small" onClick={() => handleResolve(item.client_id, "discard")} disabled={busy}>
                          放弃旧成绩（已失效）
                        </button>
                        <button className="small" onClick={() => handleResolve(item.client_id, "keep-local")} disabled={busy}>
                          仍要保留本地
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="small" onClick={() => handleResolve(item.client_id, "accept-remote")} disabled={busy}>
                          采用远端
                        </button>
                        <button className="small" onClick={() => handleResolve(item.client_id, "keep-local")} disabled={busy}>
                          保留本地重推
                        </button>
                      </>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
