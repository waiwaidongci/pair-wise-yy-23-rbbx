/**
 * 空状态占位。
 */
export function EmptyState({ title = "暂无数据", hint }: { title?: string; hint?: string }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {hint && <p className="muted">{hint}</p>}
    </div>
  );
}
