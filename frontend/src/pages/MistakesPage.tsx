import { useEffect, useMemo } from "react";
import { useAnswerRecordStore } from "../stores/AnswerRecordStore";
import { useBrailleSymbolStore } from "../stores/BrailleSymbolStore";
import { usePracticeSessionStore } from "../stores/PracticeSessionStore";
import { BrailleCell } from "../components/common/BrailleCell";
import { ResultBadge } from "../components/common/ResultBadge";
import { EmptyState } from "../components/common/EmptyState";
import { formatDate } from "../utils/formatters";

export function MistakesPage({ onNavigate }: { onNavigate: (route: string) => void }) {
  const { rows: records, load: loadRecords } = useAnswerRecordStore();
  const { rows: symbols, load: loadSymbols } = useBrailleSymbolStore();
  const { rows: sessions, load: loadSessions } = usePracticeSessionStore();

  useEffect(() => {
    void loadRecords();
    void loadSymbols();
    void loadSessions();
  }, [loadRecords, loadSymbols, loadSessions]);

  const mistakes = useMemo(
    () =>
      records
        .filter((r) => !r.correct && !r.stale)
        .sort((a, b) => (b.id ?? 0) - (a.id ?? 0)),
    [records]
  );

  const symbolById = useMemo(() => new Map(symbols.map((s) => [s.id, s])), [symbols]);
  const sessionById = useMemo(() => new Map(sessions.map((s) => [s.id, s])), [sessions]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof mistakes>();
    mistakes.forEach((m) => {
      const reason = m.mistake_reason ?? "未分类错误";
      const list = map.get(reason) ?? [];
      list.push(m);
      map.set(reason, list);
    });
    return Array.from(map.entries());
  }, [mistakes]);

  return (
    <main className="page">
      <section className="page-head">
        <div>
          <p className="eyebrow">错题归档</p>
          <h1>错题本</h1>
        </div>
      </section>

      {mistakes.length === 0 ? (
        <EmptyState title="没有错题" hint="继续保持，去练习模式巩固一下" />
      ) : (
        <>
          {grouped.map(([reason, list]) => (
            <section key={reason} className="panel">
              <h2>
                {reason}（{list.length}）
              </h2>
              <div className="table">
                {list.map((m) => {
                  const sym = symbolById.get(m.symbol_id);
                  const session = sessionById.get(m.session_id);
                  return (
                    <article key={m.id} className="row mistake-row">
                      <div className="mistake-symbol">
                        {sym && <BrailleCell symbol={sym} size="sm" />}
                        <strong>{sym?.letter ?? "?"}</strong>
                      </div>
                      <div className="mistake-detail">
                        <span>
                          你答 <ResultBadge correct={false} label={m.user_answer || "（未作答）"} />
                          正确答案 <strong>{sym?.letter}</strong>
                        </span>
                        <span className="muted">
                          {session ? formatDate(session.started_at) : ""} · 用时 {m.latency_ms}ms
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
          <div className="practice-footer">
            <button className="primary" onClick={() => onNavigate("/practice")}>
              重新练习
            </button>
          </div>
        </>
      )}
    </main>
  );
}
