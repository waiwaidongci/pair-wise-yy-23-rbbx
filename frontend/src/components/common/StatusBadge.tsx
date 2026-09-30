/**
 * 状态徽章。
 * 支持按状态值映射语义色调（成功/警告/失败/信息），文案直接展示。
 */
const TONE_CLASS: Record<string, string> = {
  SYNCED: "ok",
  PENDING: "info",
  CONFLICT: "warn",
  FAILED: "bad",
  STALE: "warn",
  MASTERED: "ok",
  FAMILIAR: "ok",
  LEARNING: "info",
  NEW: "neutral"
};

export function StatusBadge({ value, text }: { value: string; text?: string }) {
  const tone = TONE_CLASS[value] ?? "neutral";
  const label = text ?? value;
  return <span className={`badge tone-${tone}`}>{label}</span>;
}
