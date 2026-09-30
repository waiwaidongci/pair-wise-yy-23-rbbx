/**
 * 指标卡片。
 */
export function StatCard({
  label,
  value,
  hint,
  tone = "default"
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "ok" | "warn" | "bad" | "info";
}) {
  return (
    <div className={`stat tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <em className="stat-hint">{hint}</em>}
    </div>
  );
}
