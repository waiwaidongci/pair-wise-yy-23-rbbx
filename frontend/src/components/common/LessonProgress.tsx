import { StatusBadge } from "./StatusBadge";

export function LessonProgress({
  title,
  percent,
  staleCount = 0,
  value
}: {
  title?: string;
  percent?: number;
  staleCount?: number;
  value?: string;
}) {
  if (typeof percent === "number") {
    return (
      <div className="lesson-progress">
        <div className="lesson-progress-head">
          <strong>{title ?? "课程进度"}</strong>
          <span>{percent}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${percent}%` }} />
        </div>
        {staleCount > 0 ? <StatusBadge value="STALE" label={`${staleCount} 个旧会话已失效`} /> : null}
      </div>
    );
  }
  return (
    <div className="shared-widget">
      <strong>{title ?? "LessonProgress"}</strong>
      <StatusBadge value={value ?? "READY"} />
    </div>
  );
}
