import { useEffect, useMemo, useState } from "react";
import { BrailleCell } from "../components/common/BrailleCell";
import { EmptyState } from "../components/common/EmptyState";
import { ResultBadge } from "../components/common/ResultBadge";
import { StatusBadge } from "../components/common/StatusBadge";
import { useBraillePattern } from "../hooks/useBraillePattern";
import { useBrailleSymbolStore } from "../stores/BrailleSymbolStore";
import { useAnswerRecordStore } from "../stores/AnswerRecordStore";
import { usePracticeSessionStore } from "../stores/PracticeSessionStore";
import { computeMistakeBook } from "../services/progressSelectors";
import { formatLatency } from "../utils/formatters";

const REASON_TEXT: Record<string, string> = {
  DOT_MISS: "漏点",
  WRONG_LETTER: "字符辨认错误",
  DOT_EXTRA: "多点"
};

export function MistakesPage() {
  const { rows: records, load: loadRecords } = useAnswerRecordStore();
  const { rows: symbols, load: loadSymbols } = useBrailleSymbolStore();
  const { rows: sessions, load: loadSessions } = usePracticeSessionStore();
  const [reason, setReason] = useState("");

  useEffect(() => {
    void loadRecords();
    void loadSymbols();
    void loadSessions();
  }, [loadRecords, loadSymbols, loadSessions]);

  const mistakes = useMemo(() => {
    const book = computeMistakeBook(records);
    return reason ? book.filter((record) => record.mistake_reason === reason) : book;
  }, [records, reason]);

  const reasons = [...new Set(computeMistakeBook(records).map((record) => record.mistake_reason).filter(Boolean))];
  const staleCount = records.filter((record) => record.sync_state === "STALE").length;

  return (
    <section className="page-body">
      <header className="page-title">
        <h1>错题本</h1>
        <p>只统计有效答题记录；课程变化失效（STALE）的旧记录自动排除。</p>
      </header>

      <div className="panel">
        <div className="filter-row">
          <h2>按错误原因归类</h2>
          <select value={reason} onChange={(event) => setReason(event.target.value)}>
            <option value="">全部原因</option>
            {reasons.map((item) => (
              <option key={item} value={item}>
                {REASON_TEXT[item] ?? item}
              </option>
            ))}
          </select>
        </div>
        {staleCount > 0 ? <p className="hint">{staleCount} 条失效旧记录已从错题本排除。</p> : null}
        {mistakes.length === 0 ? (
          <EmptyState title="暂无错题，去练习模式挑战一下吧" />
        ) : (
          <div className="mistake-list">
            {mistakes.map((record) => (
              <MistakeRow key={record.record_uid} record={record} symbols={symbols} sessions={sessions} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function MistakeRow({
  record,
  symbols,
  sessions
}: {
  record: ReturnType<typeof useAnswerRecordStore.getState>["rows"][number];
  symbols: ReturnType<typeof useBrailleSymbolStore.getState>["rows"];
  sessions: ReturnType<typeof usePracticeSessionStore.getState>["rows"];
}) {
  const symbol = symbols.find((item) => item.id === record.symbol_id);
  const session = sessions.find((item) => item.session_uid === record.session_uid);
  const { pattern } = useBraillePattern(symbol?.letter);
  return (
    <article className="mistake-card">
      <BrailleCell pattern={pattern || symbol?.cell_pattern} size={56} />
      <div className="mistake-meta">
        <strong>{symbol?.letter ?? `字符#${record.symbol_id}`}</strong>
        <span>
          你的作答：{record.user_answer || "（空）"} · 耗时 {formatLatency(record.latency_ms)}
        </span>
        <span>{REASON_TEXT[record.mistake_reason] ?? record.mistake_reason}</span>
      </div>
      <div className="mistake-side">
        <ResultBadge correct={false} />
        {session?.sync_state === "STALE" ? <StatusBadge value="STALE" /> : <StatusBadge value={record.sync_state} />}
      </div>
    </article>
  );
}
