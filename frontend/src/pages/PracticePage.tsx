import { useEffect, useMemo, useState } from "react";
import { BrailleCell } from "../components/common/BrailleCell";
import { EmptyState } from "../components/common/EmptyState";
import { PracticePanel } from "../components/common/PracticePanel";
import { ResultBadge } from "../components/common/ResultBadge";
import { StatusBadge } from "../components/common/StatusBadge";
import { ConflictCenter } from "../components/sync/ConflictCenter";
import { NetworkSimulator } from "../components/sync/NetworkSimulator";
import { isSamePattern, useBraillePattern } from "../hooks/useBraillePattern";
import { usePracticeRunner } from "../hooks/usePracticeRunner";
import { useSyncStatus } from "../hooks/useSyncStatus";
import { useBrailleSymbolStore } from "../stores/BrailleSymbolStore";
import { useLessonStore } from "../stores/LessonStore";
import { useAnswerRecordStore } from "../stores/AnswerRecordStore";
import { usePracticeSessionStore } from "../stores/PracticeSessionStore";
import { PracticeMode } from "../constants/PracticeMode";
import type { Lesson } from "../types/Lesson";
import type { PracticeMode as PracticeModeType } from "../types/PracticeMode";

export function PracticePage() {
  const status = useSyncStatus();
  const { rows: lessons, load: loadLessons } = useLessonStore();
  const { rows: symbols, load: loadSymbols } = useBrailleSymbolStore();
  const { rows: records, load: loadRecords } = useAnswerRecordStore();
  const { rows: sessions, load: loadSessions } = usePracticeSessionStore();
  const runner = usePracticeRunner();

  const [lessonId, setLessonId] = useState<number | null>(null);
  const [mode, setMode] = useState<PracticeModeType>("CELL_TO_TEXT");

  useEffect(() => {
    void status.refresh();
    void loadLessons();
    void loadSymbols();
    void loadRecords();
    void loadSessions();
  }, [loadLessons, loadSymbols, loadRecords, loadSessions]);

  useEffect(() => {
    if (lessonId === null && lessons.length > 0) setLessonId(lessons[0].id);
  }, [lessons, lessonId]);

  const lesson = lessons.find((item) => item.id === lessonId) ?? null;
  const lessonSymbols = useMemo(
    () => (lesson ? symbols.filter((symbol) => lesson.symbol_ids.includes(symbol.id)) : []),
    [lesson, symbols]
  );

  return (
    <section className="page-body">
      <header className="page-title">
        <h1>练习模式</h1>
        <p>断网也能继续作答，每条答题记录即时入库；回网后按答题记录合并，重复同步只收一次。</p>
      </header>

      <NetworkSimulator />
      <ConflictCenter />
      {status.failed > 0 ? <FailureRetryNotice /> : null}

      {runner.draft ? (
        <ActivePractice
          symbols={lessonSymbols.length ? lessonSymbols : symbols}
          mode={runner.draft.session.mode as PracticeModeType}
          runner={runner}
        />
      ) : (
        <PracticePanel title="开始练习">
          <div className="practice-setup">
            <label>
              选择课程
              <select value={lessonId ?? ""} onChange={(event) => setLessonId(Number(event.target.value))}>
                {lessons.map((item: Lesson) => (
                  <option key={item.id} value={item.id}>
                    {item.title}（{item.symbol_ids.length} 字 · rev {item.revision}）
                  </option>
                ))}
              </select>
            </label>
            <label>
              练习模式
              <select value={mode} onChange={(event) => setMode(event.target.value as PracticeModeType)}>
                {PracticeMode.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <PracticeGate lesson={lesson} status={status} onStart={() => lesson && void runner.start(lesson, mode)} />
          </div>
          <StaleSessionHint sessions={sessions} records={records} />
        </PracticePanel>
      )}
    </section>
  );
}

function FailureRetryNotice() {
  const status = useSyncStatus();
  return (
    <div className="panel gate failure">
      <strong>有写入失败的队列项</strong>
      <p>失败不会丢数据：队列已保留，点击按钮从断点续传后再继续。</p>
      <button className="sim-button" onClick={() => void status.flush()}>
        重试失败项并继续同步
      </button>
    </div>
  );
}

function PracticeGate({
  lesson,
  status,
  onStart
}: {
  lesson: Lesson | null;
  status: ReturnType<typeof useSyncStatus>;
  onStart: () => void;
}) {
  if (status.conflictCount > 0) {
    return <p className="gate blocked">存在未处理冲突，请在上方冲突中心处理完再练习。</p>;
  }
  if (status.failed > 0) {
    return <p className="gate blocked">存在写入失败的队列项，请先断点续传成功后再练习。</p>;
  }
  if (!lesson) return <EmptyState title="请先选择课程" />;
  return (
    <div className="gate ready">
      <p className="hint">
        {status.online ? "网络正常，作答将即时同步。" : "当前断网，作答会进入待同步队列，回网自动合并。"}
      </p>
      <button className="sim-button primary" onClick={onStart}>
        开始练习（{lesson.title}）
      </button>
    </div>
  );
}

function StaleSessionHint({
  sessions,
  records
}: {
  sessions: ReturnType<typeof usePracticeSessionStore.getState>["rows"];
  records: ReturnType<typeof useAnswerRecordStore.getState>["rows"];
}) {
  const staleSessions = sessions.filter((session) => session.sync_state === "STALE");
  if (staleSessions.length === 0) {
    return <p className="hint">当前没有因课程变化失效的历史会话。</p>;
  }
  const staleRecords = records.filter((record) => record.sync_state === "STALE").length;
  return (
    <div className="stale-hint">
      <StatusBadge value="STALE" />
      <span>
        {staleSessions.length} 个会话、{staleRecords} 条答题记录因课程内容变化已失效，不计入当前进度。
      </span>
    </div>
  );
}

function ActivePractice({
  symbols,
  mode,
  runner
}: {
  symbols: ReturnType<typeof useBrailleSymbolStore.getState>["rows"];
  mode: PracticeModeType;
  runner: ReturnType<typeof usePracticeRunner>;
}) {
  const draft = runner.draft!;
  const total = symbols.length;
  const symbol = symbols[draft.currentIndex] ?? symbols[0];
  const { pattern } = useBraillePattern(symbol?.letter);
  const targetPattern = pattern || symbol?.cell_pattern || "";
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<"none" | "correct" | "wrong">("none");

  if (!symbol) return <EmptyState title="课程中没有可用字符，请先编辑课程" />;
  const submit = async () => {
    const correct =
      mode === "CELL_TO_TEXT"
        ? input.trim().toLowerCase() === symbol.letter.toLowerCase()
        : isSamePattern(input, targetPattern);
    await runner.answer({
      symbol_id: symbol.id,
      user_answer: input.trim(),
      correct,
      latency_ms: 800 + draft.currentIndex * 137,
      mistake_reason: correct ? "" : mode === "CELL_TO_TEXT" ? "WRONG_LETTER" : "DOT_MISS"
    });
    setFeedback(correct ? "correct" : "wrong");
    setTimeout(() => {
      setFeedback("none");
      setInput("");
    }, 500);
  };

  const finished = draft.currentIndex >= total;

  return (
    <PracticePanel title={`进行中 · ${mode}（第 ${Math.min(draft.currentIndex + 1, total)} / ${total} 题）`}>
      <div className={"active-practice " + feedback}>
        <div className="question">
          {mode === "CELL_TO_TEXT" ? (
            <BrailleCell pattern={targetPattern} size={96} />
          ) : (
            <div className="text-question">{symbol.letter}</div>
          )}
        </div>
        <div className="answer-row">
          <input
            value={input}
            disabled={finished}
            placeholder={mode === "CELL_TO_TEXT" ? "输入对应字母" : "输入点位，如 1,2,4"}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && input && void submit()}
          />
          {!finished ? (
            <button className="sim-button primary" disabled={!input || runner.submitting} onClick={() => void submit()}>
              提交作答
            </button>
          ) : (
            <button className="sim-button primary" onClick={() => void runner.finish()}>
              结束并合并同步
            </button>
          )}
        </div>
        <div className="feedback-row">
          {feedback !== "none" ? <ResultBadge correct={feedback === "correct"} /> : <span className="hint">作答即时保存，断网也不丢</span>}
          <StatusBadge value="PENDING" label={`已答 ${draft.records.length} 条待同步/同步中`} />
        </div>
        {finished ? <p className="hint">所有题目作答完毕，结束后会话按答题记录汇总并触发回网合并。</p> : null}
      </div>
    </PracticePanel>
  );
}
