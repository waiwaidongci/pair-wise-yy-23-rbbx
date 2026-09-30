/**
 * 结果徽章：答题即时反馈（正确/错误）。
 */
export function ResultBadge({ correct, label }: { correct: boolean | null; label?: string }) {
  if (correct === null) return null;
  return (
    <span className={`badge tone-${correct ? "ok" : "bad"}`}>
      {label ?? (correct ? "正确" : "错误")}
    </span>
  );
}
