import { useEffect, useMemo, useState } from "react";
import { useLessonStore } from "../stores/LessonStore";
import { useBrailleSymbolStore } from "../stores/BrailleSymbolStore";
import { usePracticeSessionStore } from "../stores/PracticeSessionStore";
import { BrailleCell } from "../components/common/BrailleCell";
import { StatusBadge } from "../components/common/StatusBadge";
import { LessonProgress } from "../components/common/LessonProgress";
import { EmptyState } from "../components/common/EmptyState";
import { formatNumber } from "../utils/formatters";

export function LearnPage() {
  const { rows: lessons, load: loadLessons, save: saveLesson } = useLessonStore();
  const { rows: symbols, load: loadSymbols } = useBrailleSymbolStore();
  const { rows: sessions, load: loadSessions } = usePracticeSessionStore();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftIds, setDraftIds] = useState<number[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void loadLessons();
    void loadSymbols();
    void loadSessions();
  }, [loadLessons, loadSymbols, loadSessions]);

  const sessionsByLesson = useMemo(() => {
    const map = new Map<number, { done: number; stale: number }>();
    sessions.forEach((s) => {
      const cur = map.get(s.lesson_id) ?? { done: 0, stale: 0 };
      cur.done += 1;
      if (s.stale) cur.stale += 1;
      map.set(s.lesson_id, cur);
    });
    return map;
  }, [sessions]);

  const startEdit = (lessonId: number, current: number[]) => {
    setEditingId(lessonId);
    setDraftIds([...current]);
    setNotice(null);
  };

  const toggleSymbol = (id: number) => {
    setDraftIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const saveEdit = async (lesson: (typeof lessons)[number]) => {
    const result = await saveLesson({ ...lesson, symbol_ids: draftIds });
    setEditingId(null);
    setNotice(
      result.stale_count > 0
        ? `课程内容已更新，${result.stale_count} 个旧会话成绩已失效并重算`
        : "课程内容已保存"
    );
    await loadSessions();
  };

  return (
    <main className="page">
      <section className="page-head">
        <div>
          <p className="eyebrow">点字学习</p>
          <h1>学习卡片</h1>
        </div>
      </section>

      {notice && (
        <div className="sync-banner info" role="status">
          <span className="sync-banner-text">{notice}</span>
        </div>
      )}

      {lessons.length === 0 ? (
        <EmptyState title="暂无课程" />
      ) : (
        <section className="lesson-grid">
          {lessons.map((lesson) => {
            const lessonSymbols = symbols.filter((s) => lesson.symbol_ids.includes(s.id));
            const stat = sessionsByLesson.get(lesson.id) ?? { done: 0, stale: 0 };
            const isEditing = editingId === lesson.id;
            return (
              <article key={lesson.id} className="panel lesson-card">
                <div className="lesson-card-head">
                  <div>
                    <h2>{lesson.title}</h2>
                    <p className="muted">
                      {lesson.stage} · 约 {lesson.estimated_minutes} 分钟 · {formatNumber(lesson.symbol_ids.length)} 个字符
                    </p>
                  </div>
                  {stat.stale > 0 && <StatusBadge value="STALE" text={`${stat.stale} 个旧成绩已失效`} />}
                </div>

                <div className="braille-row">
                  {lessonSymbols.map((sym) => (
                    <div key={sym.id} className="braille-chip">
                      <BrailleCell symbol={sym} showLabel />
                    </div>
                  ))}
                </div>

                <LessonProgress done={stat.done} total={lesson.symbol_ids.length} />

                {isEditing ? (
                  <div className="lesson-edit">
                    <p className="muted">勾选本课包含的字符（变更后旧成绩失效）：</p>
                    <div className="symbol-pick">
                      {symbols.map((sym) => (
                        <label key={sym.id} className={draftIds.includes(sym.id) ? "picked" : ""}>
                          <input
                            type="checkbox"
                            checked={draftIds.includes(sym.id)}
                            onChange={() => toggleSymbol(sym.id)}
                          />
                          <BrailleCell symbol={sym} size="sm" />
                          <span>{sym.letter}</span>
                        </label>
                      ))}
                    </div>
                    <div className="lesson-edit-actions">
                      <button className="primary small" onClick={() => saveEdit(lesson)}>
                        保存并触发重算
                      </button>
                      <button className="small" onClick={() => setEditingId(null)}>
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <button className="small" onClick={() => startEdit(lesson.id, lesson.symbol_ids)}>
                    变更课程内容
                  </button>
                )}
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
