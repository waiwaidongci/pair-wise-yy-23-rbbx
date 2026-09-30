import type { BrailleSymbol } from "../../types/BrailleSymbol";
import type { Lesson } from "../../types/Lesson";
import type { PracticeSession } from "../../types/PracticeSession";
import type { AnswerRecord } from "../../types/AnswerRecord";
import { createDefaultBrailleSymbol } from "../../constructors/BrailleSymbolConstructor";
import { createDefaultLesson } from "../../constructors/LessonConstructor";
import { createDefaultPracticeSession } from "../../constructors/PracticeSessionConstructor";
import { createDefaultAnswerRecord } from "../../constructors/AnswerRecordConstructor";
import { createUid } from "../../utils/uid";

export type LegacyRow = Record<string, unknown>;

function hasSyncMarkers(row: LegacyRow): boolean {
  return (
    typeof row.sync_state === "string" &&
    (typeof row.revision === "number" || typeof row.session_uid === "string" || typeof row.record_uid === "string")
  );
}

/** 历史数据缺少同步标识时先兼容迁移：补齐 uid/revision/hash，并把错型字段修正为当前类型 */
export function migrateLegacyRows(rows: LegacyRow[]): { migrated: number } {
  let migrated = 0;
  for (const row of rows) {
    if (hasSyncMarkers(row)) continue;
    Object.assign(row, normalizeLegacyRow(row));
    migrated += 1;
  }
  return { migrated };
}

export function isLegacyRow(row: LegacyRow): boolean {
  return !hasSyncMarkers(row);
}

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return fallback;
}

function toStringArray(value: unknown): number[] {
  if (Array.isArray(value)) return value.map((item) => toNumber(item, 0)).filter((item) => item > 0);
  return [];
}

/** 旧版 mock 中 correct/score 等字段是字符串，按当前模型规整并补同步标识 */
function normalizeLegacyRow(row: LegacyRow): Partial<BrailleSymbol & Lesson & PracticeSession & AnswerRecord> {
  const now = new Date().toISOString();
  const base = {
    revision: toNumber(row.revision, 0),
    sync_state: "NEW_LOCAL" as const,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : now
  };

  if (typeof row.symbol_ids !== "undefined" || typeof row.unlock_rule !== "undefined") {
    const lesson = createDefaultLesson({
      ...base,
      id: toNumber(row.id, -1),
      title: String(row.title ?? ""),
      symbol_ids: toStringArray(row.symbol_ids),
      stage: String(row.stage ?? ""),
      estimated_minutes: toNumber(row.estimated_minutes, 0),
      unlock_rule: String(row.unlock_rule ?? "NONE")
    });
    return lesson;
  }

  if (typeof row.session_id !== "undefined") {
    return createDefaultAnswerRecord({
      ...base,
      id: toNumber(row.id, -1),
      session_id: toNumber(row.session_id, -1),
      symbol_id: toNumber(row.symbol_id, -1),
      user_answer: String(row.user_answer ?? ""),
      correct: toBoolean(row.correct, false),
      latency_ms: toNumber(row.latency_ms, 0),
      mistake_reason: String(row.mistake_reason ?? ""),
      session_uid: typeof row.session_uid === "string" ? row.session_uid : createUid("legacy-session"),
      record_uid: createUid("legacy-record"),
      answered_at: typeof row.answered_at === "string" ? row.answered_at : now
    });
  }

  if (typeof row.lesson_id !== "undefined") {
    return createDefaultPracticeSession({
      ...base,
      id: toNumber(row.id, -1),
      lesson_id: toNumber(row.lesson_id, -1),
      lesson_revision: toNumber(row.lesson_revision, 0),
      mode: String(row.mode ?? "MIXED"),
      started_at: String(row.started_at ?? now),
      finished_at: String(row.finished_at ?? now),
      score: toNumber(row.score, 0),
      mistake_count: toNumber(row.mistake_count, 0),
      session_uid: createUid("legacy-session"),
      content_hash: typeof row.content_hash === "string" ? row.content_hash : ""
    });
  }

  return createDefaultBrailleSymbol({
    ...base,
    id: toNumber(row.id, -1),
    cell_pattern: String(row.cell_pattern ?? ""),
    letter: String(row.letter ?? ""),
    pinyin: String(row.pinyin ?? ""),
    category: String(row.category ?? "LETTER"),
    difficulty: String(row.difficulty ?? "1"),
    audio_hint_key: String(row.audio_hint_key ?? "")
  });
}
