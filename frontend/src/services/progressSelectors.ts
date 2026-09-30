import type { AnswerRecord } from "../types/AnswerRecord";
import type { PracticeSession } from "../types/PracticeSession";

/**
 * 课程内容变化后旧会话被标记 STALE，进度与错题统计只从有效（非 STALE、非 CONFLICT）记录重算。
 */
export function effectiveRecords(records: AnswerRecord[]): AnswerRecord[] {
  return records.filter((record) => record.sync_state !== "STALE");
}

export function effectiveSessions(sessions: PracticeSession[]): PracticeSession[] {
  return sessions.filter((session) => session.sync_state !== "STALE");
}

export function computeLessonProgress(input: {
  lessonId: number;
  sessions: PracticeSession[];
  records: AnswerRecord[];
}): { total: number; correct: number; accuracy: number; sessions: number; staleSessions: number } {
  const sessions = input.sessions.filter((session) => session.lesson_id === input.lessonId);
  const sessionUids = new Set(sessions.map((session) => session.session_uid));
  const records = input.records.filter(
    (record) => sessionUids.has(record.session_uid) && record.sync_state !== "STALE"
  );
  const correct = records.filter((record) => record.correct).length;
  return {
    total: records.length,
    correct,
    accuracy: records.length ? Math.round((correct / records.length) * 100) : 0,
    sessions: sessions.filter((session) => session.sync_state !== "STALE").length,
    staleSessions: sessions.filter((session) => session.sync_state === "STALE").length
  };
}

export function computeMistakeBook(records: AnswerRecord[]): AnswerRecord[] {
  const valid = effectiveRecords(records).filter((record) => !record.correct);
  // 同一字符只保留最近一次错误，避免错题本被历史重复作答淹没
  const latestBySymbol = new Map<number, AnswerRecord>();
  for (const record of valid) {
    const existing = latestBySymbol.get(record.symbol_id);
    if (!existing || existing.answered_at < record.answered_at) latestBySymbol.set(record.symbol_id, record);
  }
  return [...latestBySymbol.values()].sort((a, b) => b.answered_at.localeCompare(a.answered_at));
}

export function masteryBySymbol(records: AnswerRecord[]): Map<number, { correct: number; total: number; level: string }> {
  const result = new Map<number, { correct: number; total: number; level: string }>();
  for (const record of effectiveRecords(records)) {
    const entry = result.get(record.symbol_id) ?? { correct: 0, total: 0, level: "NEW" };
    entry.total += 1;
    if (record.correct) entry.correct += 1;
    const ratio = entry.correct / entry.total;
    entry.level = entry.total < 2 ? "NEW" : ratio >= 0.8 ? "MASTERED" : ratio >= 0.5 ? "FAMILIAR" : "LEARNING";
    result.set(record.symbol_id, entry);
  }
  return result;
}
