import { useEffect, useMemo, useState } from "react";
import { BrailleCell } from "../components/common/BrailleCell";
import { EmptyState } from "../components/common/EmptyState";
import { LessonProgress } from "../components/common/LessonProgress";
import { StatusBadge } from "../components/common/StatusBadge";
import { LessonEditor } from "../components/lesson/LessonEditor";
import { useBraillePattern } from "../hooks/useBraillePattern";
import { useBrailleSymbolStore } from "../stores/BrailleSymbolStore";
import { useLessonStore } from "../stores/LessonStore";
import { useAnswerRecordStore } from "../stores/AnswerRecordStore";
import { usePracticeSessionStore } from "../stores/PracticeSessionStore";
import { computeLessonProgress } from "../services/progressSelectors";

function SymbolCard({ symbolId, symbols }: { symbolId: number; symbols: ReturnType<typeof useBrailleSymbolStore.getState>["rows"] }) {
  const symbol = symbols.find((item) => item.id === symbolId);
  const { pattern } = useBraillePattern(symbol?.letter);
  if (!symbol) return <EmptyState title={`字符 #${symbolId} 已随课程移除`} />;
  return (
    <article className="symbol-card">
      <BrailleCell pattern={pattern || symbol.cell_pattern} />
      <div className="symbol-meta">
        <strong>{symbol.letter}</strong>
        <span>{symbol.pinyin}</span>
        <StatusBadge value={symbol.category} label={`难度 ${symbol.difficulty}`} />
      </div>
    </article>
  );
}

export function LearnPage() {
  const { rows: symbols, load: loadSymbols } = useBrailleSymbolStore();
  const { rows: lessons, load: loadLessons } = useLessonStore();
  const { rows: records, load: loadRecords } = useAnswerRecordStore();
  const { rows: sessions, load: loadSessions } = usePracticeSessionStore();
  const [difficulty, setDifficulty] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);

  useEffect(() => {
    void loadSymbols();
    void loadLessons();
    void loadRecords();
    void loadSessions();
  }, [loadSymbols, loadLessons, loadRecords, loadSessions]);

  useEffect(() => {
    if (selectedLessonId === null && lessons.length > 0) setSelectedLessonId(lessons[0].id);
  }, [lessons, selectedLessonId]);

  const selectedLesson = lessons.find((lesson) => lesson.id === selectedLessonId);
  const visibleSymbols = useMemo(
    () => symbols.filter((symbol) => !difficulty || symbol.difficulty === difficulty),
    [symbols, difficulty]
  );
  const progress = selectedLesson
    ? computeLessonProgress({ lessonId: selectedLesson.id, sessions, records })
    : null;

  return (
    <section className="page-body">
      <header className="page-title">
        <h1>学习卡片</h1>
        <p>按课程浏览盲文字符卡片；修改课程内容后，旧练习会话和进度会重算失效。</p>
      </header>

      <div className="learn-layout">
        <div className="panel">
          <h2>课程</h2>
          <div className="lesson-list">
            {lessons.map((lesson) => (
              <button
                key={lesson.id}
                className={"lesson-item " + (lesson.id === selectedLessonId ? "active" : "")}
                onClick={() => setSelectedLessonId(lesson.id)}
              >
                <span>{lesson.title}</span>
                <StatusBadge value={lesson.sync_state} />
              </button>
            ))}
          </div>
          {selectedLesson ? <LessonEditor key={selectedLesson.id + selectedLesson.revision} lesson={selectedLesson} /> : <EmptyState />}
        </div>

        <div className="panel">
          <div className="filter-row">
            <h2>点字字符卡片</h2>
            <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
              <option value="">全部难度</option>
              <option value="1">难度 1</option>
              <option value="2">难度 2</option>
              <option value="3">难度 3</option>
            </select>
          </div>
          {selectedLesson ? (
            <LessonProgress
              title={`${selectedLesson.title} · 有效进度`}
              percent={progress?.accuracy ?? 0}
              staleCount={progress?.staleSessions ?? 0}
            />
          ) : null}
          <div className="symbol-grid">
            {(selectedLesson ? visibleSymbols.filter((symbol) => selectedLesson.symbol_ids.includes(symbol.id)) : visibleSymbols).map(
              (symbol) => (
                <SymbolCard key={symbol.id} symbolId={symbol.id} symbols={symbols} />
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
