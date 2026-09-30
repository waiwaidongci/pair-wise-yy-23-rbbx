import { useSyncStore } from "../../stores/SyncStore";
import { formatFailureReason } from "../../utils/formatters";

function tryParse(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function preview(entity: string, raw: string): string {
  const data = tryParse(raw);
  if (entity === "Lesson") {
    return `《${String(data.title ?? "?")}》 revision=${String(data.revision ?? "?")} 字符=${Array.isArray(data.symbol_ids) ? (data.symbol_ids as number[]).join(",") : "?"}`;
  }
  return `题目#${String(data.symbol_id ?? "?")} 作答="${String(data.user_answer ?? "?")}" ${data.correct ? "正确" : "错误"}`;
}

/** 冲突处理中心：逐条展示本地/远端差异，处理完（保留本地或采用远端）后才能继续练习 */
export function ConflictCenter() {
  const conflicts = useSyncStore((state) => state.conflicts);
  const resolveConflict = useSyncStore((state) => state.resolveConflict);

  if (conflicts.length === 0) {
    return (
      <div className="panel conflict-center clean">
        <h2>同步冲突</h2>
        <p className="hint">没有待处理冲突，可以开始练习。</p>
      </div>
    );
  }

  return (
    <div className="panel conflict-center has-conflict">
      <h2>同步冲突（{conflicts.length}）— 请先处理完再练习</h2>
      <div className="conflict-list">
        {conflicts.map((conflict) => (
          <article className="conflict-card" key={conflict.id}>
            <header>
              <strong>{conflict.entity} #{conflict.entity_id}</strong>
              <span className="badge conflict">{formatFailureReason(conflict.error_code, conflict.reason)}</span>
            </header>
            <div className="conflict-body">
              <div className="conflict-side local">
                <span>本地版本</span>
                <code>{preview(conflict.entity, conflict.local_payload)}</code>
              </div>
              <div className="conflict-side remote">
                <span>远端版本</span>
                <code>{preview(conflict.entity, conflict.remote_payload)}</code>
              </div>
            </div>
            <footer>
              <button className="sim-button" onClick={() => void resolveConflict(conflict.id, "LOCAL")}>
                保留本地（重新提交）
              </button>
              <button className="sim-button ghost" onClick={() => void resolveConflict(conflict.id, "REMOTE")}>
                采用远端（丢弃本地）
              </button>
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
}
