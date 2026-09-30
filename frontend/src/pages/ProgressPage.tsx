import { useEffect, useMemo } from "react";
import { useLessonStore } from "../stores/LessonStore";
import { usePracticeSessionStore } from "../stores/PracticeSessionStore";
import { useAnswerRecordStore } from "../stores/AnswerRecordStore";
import { StatCard } from "../components/common/StatCard";
import { ChartPanel } from "../components/common/ChartPanel";
import { StatusBadge } from "../components/common/StatusBadge";
import { EmptyState } from "../components/common/EmptyState";
import { formatDate, formatNumber } from "../utils/formatters";

export function ProgressPage() {
  const { rows: lessons, load: loadLessons } = useLessonStore();
  const { rows: sessions, load: loadSessions } = usePracticeSessionStore();
  const { rows: records, load: loadRecords } = useAnswerRecordStore();

  useEffect(() => {
    void loadLessons();
    void loadSessions();
    void loadRecords();
  }, [loadLessons, loadSessions, loadRecords]);

  const stats = useMemo(() => {
    const validSessions = sessions.filter((s) => !s.stale);
    const validRecords = records.filter((r) => !r.stale);
    const total = validRecords.length;
    const correct = validRecords.filter((r) => r.correct).length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    const avgScore = validSessions.length > 0
      ? Math.round(validSessions.reduce((sum, s) => sum + (s.score || 0), 0) / validSessions.length)
      : 0;
    return {
      sessions: validSessions.length,
      total,
      correct,
      accuracy,
      avgScore,
      staleSessions: sessions.filter((s) => s.stale).length
    };
  }, [sessions, records]);

  // 正确率趋势：按会话顺序
  const trend = useMemo(
    () =>
      sessions
        .filter((s) => !s.stale && s.finished_at)
        .sort((a, b) => (a.started_at || "").localeCompare(b.started_at || ""))
        .map((s, i) => ({
          label: `第${i + 1}次`,
          value: s.score || 0,
          tone: s.score >= 80 ? "ok" : s.score >= 60 ? "info" : "bad"
        })),
    [sessions]
  );

  const lessonProgress = useMemo(() => {
    return lessons.map((l) => {
      const lessonSessions = sessions.filter((s) => s.lesson_id === l.id && !s.stale);
      const best = lessonSessions.length > 0 ? Math.max(...lessonSessions.map((s) => s.score || 0)) : 0;
      return { id: l.id, title: l.title, count: lessonSessions.length, best };
    });
  }, [lessons, sessions]);

  const staleSessions = sessions.filter((s) => s.stale);

  return (
    <main className="page">
      <section className="page-head">
        <div>
          <p className="eyebrow">学习统计</p>
          <h1>学习进度</h1>
        </div>
      </section>

      <section className="metrics">
        <StatCard label="有效练习次数" value={stats.sessions} hint={`已失效 ${stats.staleSessions} 次`} />
        <StatCard label="答题总数" value={formatNumber(stats.total)} />
        <StatCard label="正确率" value={`${stats.accuracy}%`} tone={stats.accuracy >= 80 ? "ok" : "warn"} />
        <StatCard label="平均得分" value={stats.avgScore} />
      </section>

      {stats.staleSessions > 0 && (
        <section className="panel">
          <h2>课程已更新，旧成绩已重算</h2>
          <p className="muted">
            有 {stats.staleSessions} 次练习因课程内容变化而失效，已从进度统计中剔除。
          </p>
          <div className="table">
            {staleSessions.map((s) => (
              <article key={s.id} className="row">
                <strong>{formatDate(s.started_at)}</strong>
                <span className="muted">得分 {s.score}</span>
                <StatusBadge value="STALE" text="已失效" />
              </article>
            ))}
          </div>
        </section>
      )}

      <ChartPanel title="历次得分趋势" data={trend} />

      <section className="panel">
        <h2>分课程进度</h2>
        {lessonProgress.length === 0 ? (
          <EmptyState title="暂无进度" />
        ) : (
          <div className="table">
            {lessonProgress.map((lp) => (
              <article key={lp.id} className="row">
                <strong>{lp.title}</strong>
                <span className="muted">练习 {lp.count} 次</span>
                <span>最高分 {lp.best}</span>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
