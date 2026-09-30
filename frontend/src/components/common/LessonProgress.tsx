/**
 * 课程进度条：已完成会话数 / 目标数。
 */
export function LessonProgress({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <div className="lesson-progress">
      <div className="lesson-progress-bar">
        <div className="lesson-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="lesson-progress-text">
        {done}/{total} 次练习
      </span>
    </div>
  );
}
