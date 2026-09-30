import { useEffect, useMemo, useState } from "react";
import { useLessonStore } from "../stores/LessonStore";
import { useBrailleSymbolStore } from "../stores/BrailleSymbolStore";
import { usePracticeSession } from "../hooks/usePracticeSession";
import { useSyncQueue } from "../hooks/useSyncQueue";
import { SyncGate } from "../components/common/SyncGate";
import { BrailleCell } from "../components/common/BrailleCell";
import { PracticePanel } from "../components/common/PracticePanel";
import { ResultBadge } from "../components/common/ResultBadge";
import { StatusBadge } from "../components/common/StatusBadge";
import { EmptyState } from "../components/common/EmptyState";
import { PracticeModeText } from "../constants/PracticeMode";
import { formatNumber } from "../utils/formatters";

export function PracticePage({ onNavigate }: { onNavigate: (route: string) => void }) {
  const { rows: lessons, load: loadLessons } = useLessonStore();
  const { rows: symbols, load: loadSymbols } = useBrailleSymbolStore();
  const [lessonId, setLessonId] = useState<number | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const { counts } = useSyncQueue();

  useEffect(() => {
    void loadLessons();
    void loadSymbols();
  }, [loadLessons, loadSymbols]);

  const lesson = useMemo(() => lessons.find((l) => l.id === lessonId), [lessons, lessonId]);
  const practice = usePracticeSession(lesson, symbols);

  const handleChoose = (letter: string) => {
    if (chosen) return;
    setChosen(letter);
    void practice.answer(letter).then(() => {
      window.setTimeout(() => setChosen(null), 650);
    });
  };

  return (
    <main className="page">
      <section className="page-head">
        <div>
          <p className="eyebrow">随堂练习</p>
          <h1>练习模式</h1>
        </div>
        {counts.pending > 0 && <StatusBadge value="PENDING" text={`${counts.pending} 条待同步`} />}
      </section>

      <SyncGate onNavigate={onNavigate}>
        {practice.phase === "idle" && (
          <section className="panel">
            <h2>选择课程</h2>
            {lessons.length === 0 ? (
              <EmptyState title="暂无课程" hint="请先在学习卡片中添加课程" />
            ) : (
              <div className="lesson-pick">
                {lessons.map((l) => (
                  <button
                    key={l.id}
                    className={lessonId === l.id ? "pick active" : "pick"}
                    onClick={() => setLessonId(l.id)}
                  >
                    <strong>{l.title}</strong>
                    <span className="muted">
                      {PracticeModeText.CELL_TO_TEXT} · {formatNumber(l.symbol_ids.length)} 字符
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="practice-footer">
              <button
                className="primary"
                disabled={!lesson || lesson.symbol_ids.length === 0}
                onClick={() => void practice.start()}
              >
                开始练习
              </button>
            </div>
          </section>
        )}

        {practice.phase === "active" && practice.current && (
          <PracticePanel
            title={`第 ${practice.currentIndex + 1} / ${practice.total} 题 · 看点阵选字母`}
            footer={
              <ResultBadge
                correct={chosen === null ? null : chosen === practice.current.symbol.letter}
              />
            }
          >
            <div className="question">
              <BrailleCell symbol={practice.current.symbol} size="lg" />
              <p className="muted">这是哪个点字字符？</p>
              <div className="options">
                {practice.current.options.map((opt) => (
                  <button
                    key={opt}
                    className={`option ${chosen === opt ? (opt === practice.current.symbol.letter ? "correct" : "wrong") : ""}`}
                    disabled={!!chosen}
                    onClick={() => handleChoose(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </PracticePanel>
        )}

        {practice.phase === "done" && practice.result && (
          <section className="panel result-panel">
            <h2>练习完成</h2>
            <div className="metrics">
              <div className="stat">
                <span>得分</span>
                <strong>{practice.result.session.score}</strong>
              </div>
              <div className="stat">
                <span>答对</span>
                <strong>{practice.result.correct}/{practice.result.total}</strong>
              </div>
              <div className="stat">
                <span>答错</span>
                <strong>{practice.result.mistake_count}</strong>
              </div>
            </div>
            <p className="muted">
              本次会话与答题记录已保存到本地待同步队列，联网后按答题记录合并（重复同步只收一次）。
            </p>
            <div className="practice-footer">
              <button className="primary" onClick={practice.reset}>
                再练一次
              </button>
            </div>
          </section>
        )}
      </SyncGate>
    </main>
  );
}
