import { useEffect, useMemo } from "react";
import { ChartPanel } from "../components/common/ChartPanel";
import { EmptyState } from "../components/common/EmptyState";
import { LessonProgress } from "../components/common/LessonProgress";
import { StatusBadge } from "../components/common/StatusBadge";
import { useLessonStore } from "../stores/LessonStore";
import { usePracticeSessionStore } from "../stores/PracticeSessionStore";
import { useAnswerRecordStore } from "../stores/AnswerRecordStore";
import { computeLessonProgress, effectiveRecords, masteryBySymbol } from "../services/progressSelectors";
import { formatDate, formatPercent } from "../utils/formatters";

export function ProgressPage() {
  const { rows: lessons, load: loadLessons } = useLessonStore();
  const { rows: sessions, load: loadSessions } = usePracticeSessionStore();
  const { rows: records, load: loadRecords } = useAnswerRecordStore();

  useEffect(() => {
    void loadLessons();
    void loadSessions();
    void loadRecords();
  }, [loadLessons, loadSessions, loadRecords]);

  const validRecords = useMemo(() => effectiveRecords(records), [records]);
  const overallAccuracy = useMemo(() => {
    if (validRecords.length === 0) return 0;
    return Math.round((validRecords.filter((record) => record.correct).length / validRecords.length) * 100);
  }, [validRecords]);

  const mastery = useMemo(() => masteryBySymbol(records), [records]);
  const masteryData = useMemo(
    () =>
      (["NEW", "LEARNING", "FAMILIAR", "MASTERED"] as const).map((level) => ({
        label: { NEW: "新学", LEARNING: "学习中", FAMILIAR: "熟悉", MASTERED: "掌握" }[level],
        value: [...mastery.values()].filter((item) => item.level === level).length
      })),
    [mastery]
  );

  const accuracyByLesson = lessons.map((lesson) => ({
    label: lesson.title,
    value: computeLessonProgress({ lessonId: lesson.id, sessions, records }).accuracy,
    tone: "tone-green"
  }));

  const staleSessions = sessions.filter((session) => session.sync_state === "STALE");

  return (
    <section className="page-body">
      <header className="page-title">
        <h1>学习进度</h1>
        <p>全部指标由有效答题记录重算；课程内容变化后的旧结果标记失效，不参与统计。</p>
      </header>

      <div className="metrics">
        <div className="stat">
          <span>有效答题数</span>
          <strong>{validRecords.length}</strong>
        </div>
        <div className="stat">
          <span>综合正确率</span>
          <strong>{formatPercent(overallAccuracy)}</strong>
        </div>
        <div className="stat">
          <span>失效会话</span>
          <strong>{staleSessions.length}</strong>
        </div>
      </div>

      <div className="progress-grid">
        <ChartPanel title="各课程正确率（%）" data={accuracyByLesson} />
        <ChartPanel title="掌握程度分布（字符数）" data={masteryData} />
      </div>

      <div className="panel">
        <h2>课程进度明细</h2>
        {lessons.length === 0 ? <EmptyState /> : null}
        <div className="lesson-progress-list">
          {lessons.map((lesson) => {
            const progress = computeLessonProgress({ lessonId: lesson.id, sessions, records });
            return (
              <article className="row lesson-progress-row" key={lesson.id}>
                <div className="lesson-progress-info">
                  <strong>{lesson.title}</strong>
                  <span>
                    {progress.sessions} 个有效会话 · {progress.total} 条作答 · 正确率 {progress.accuracy}%
                  </span>
                  <span className="hint">
                    rev {lesson.revision} · hash {lesson.content_hash}
                  </span>
                </div>
                <LessonProgress percent={progress.accuracy} staleCount={progress.staleSessions} />
                <StatusBadge value={lesson.sync_state} />
              </article>
            );
          })}
        </div>
      </div>

      <div className="panel">
        <h2>最近练习会话</h2>
        <div className="table">
          {sessions
            .slice()
            .sort((a, b) => b.started_at.localeCompare(a.started_at))
            .slice(0, 8)
            .map((session) => (
              <article className="row" key={session.session_uid}>
                <strong>
                  课程 #{session.lesson_id} · {session.mode}
                </strong>
                <span>{formatDate(session.started_at)}</span>
                <span>
                  {session.score} 分 · {session.mistake_count} 错
                </span>
                <StatusBadge value={session.sync_state} />
              </article>
            ))}
        </div>
      </div>
    </section>
  );
}
