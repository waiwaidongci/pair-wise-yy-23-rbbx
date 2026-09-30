import { createDefaultBrailleSymbol } from "../constructors/BrailleSymbolConstructor";
import { createDefaultLesson } from "../constructors/LessonConstructor";
import { createDefaultPracticeSession } from "../constructors/PracticeSessionConstructor";
import { createDefaultAnswerRecord } from "../constructors/AnswerRecordConstructor";
import type { BrailleSymbol } from "../types/BrailleSymbol";
import type { Lesson } from "../types/Lesson";
import type { PracticeSession } from "../types/PracticeSession";
import type { AnswerRecord } from "../types/AnswerRecord";

/** 规范种子：带 revision / uid / content_hash / 同步标识，作为模拟服务端的初始数据 */
export const seedBrailleSymbols: BrailleSymbol[] = [
  createDefaultBrailleSymbol({
    id: 1,
    cell_pattern: "1",
    letter: "a",
    pinyin: "ā",
    category: "LETTER",
    difficulty: "1",
    audio_hint_key: "letter-a",
    revision: 1,
    sync_state: "SYNCED",
    updated_at: "2026-06-01T08:00:00Z"
  }),
  createDefaultBrailleSymbol({
    id: 2,
    cell_pattern: "1,2",
    letter: "b",
    pinyin: "bō",
    category: "LETTER",
    difficulty: "1",
    audio_hint_key: "letter-b",
    revision: 1,
    sync_state: "SYNCED",
    updated_at: "2026-06-01T08:00:00Z"
  }),
  createDefaultBrailleSymbol({
    id: 3,
    cell_pattern: "1,4",
    letter: "c",
    pinyin: "cī",
    category: "LETTER",
    difficulty: "2",
    audio_hint_key: "letter-c",
    revision: 1,
    sync_state: "SYNCED",
    updated_at: "2026-06-01T08:00:00Z"
  }),
  createDefaultBrailleSymbol({
    id: 4,
    cell_pattern: "1,4,5",
    letter: "d",
    pinyin: "dī",
    category: "LETTER",
    difficulty: "2",
    audio_hint_key: "letter-d",
    revision: 1,
    sync_state: "SYNCED",
    updated_at: "2026-06-01T08:00:00Z"
  }),
  createDefaultBrailleSymbol({
    id: 5,
    cell_pattern: "1,5",
    letter: "e",
    pinyin: "ē",
    category: "LETTER",
    difficulty: "1",
    audio_hint_key: "letter-e",
    revision: 1,
    sync_state: "SYNCED",
    updated_at: "2026-06-01T08:00:00Z"
  }),
  createDefaultBrailleSymbol({
    id: 6,
    cell_pattern: "5",
    letter: "，",
    pinyin: "dòu hào",
    category: "PUNCTUATION",
    difficulty: "3",
    audio_hint_key: "punc-comma",
    revision: 1,
    sync_state: "SYNCED",
    updated_at: "2026-06-01T08:00:00Z"
  })
];

export const seedLessons: Lesson[] = [
  createDefaultLesson({
    id: 1,
    title: "字母起步 a-c",
    symbol_ids: [1, 2, 3],
    stage: "1",
    estimated_minutes: 10,
    unlock_rule: "NONE",
    revision: 1,
    sync_state: "SYNCED",
    updated_at: "2026-06-02T08:00:00Z"
  }),
  createDefaultLesson({
    id: 2,
    title: "字母进阶 d-e",
    symbol_ids: [4, 5],
    stage: "2",
    estimated_minutes: 12,
    unlock_rule: "LESSON_1_DONE",
    revision: 1,
    sync_state: "SYNCED",
    updated_at: "2026-06-02T08:00:00Z"
  }),
  createDefaultLesson({
    id: 3,
    title: "标点入门",
    symbol_ids: [6],
    stage: "3",
    estimated_minutes: 6,
    unlock_rule: "LESSON_2_DONE",
    revision: 1,
    sync_state: "SYNCED",
    updated_at: "2026-06-02T08:00:00Z"
  })
];

const lessonHashById = new Map(seedLessons.map((lesson) => [lesson.id, lesson.content_hash]));

export const seedPracticeSessions: PracticeSession[] = [
  createDefaultPracticeSession({
    id: 1,
    lesson_id: 1,
    lesson_revision: 1,
    mode: "CELL_TO_TEXT",
    started_at: "2026-06-10T09:00:00Z",
    finished_at: "2026-06-10T09:05:00Z",
    score: 67,
    mistake_count: 1,
    session_uid: "seed-session-1",
    content_hash: lessonHashById.get(1) ?? "",
    sync_state: "SYNCED",
    updated_at: "2026-06-10T09:05:00Z"
  }),
  createDefaultPracticeSession({
    id: 2,
    lesson_id: 1,
    lesson_revision: 1,
    mode: "TEXT_TO_CELL",
    started_at: "2026-06-11T09:00:00Z",
    finished_at: "2026-06-11T09:04:00Z",
    score: 100,
    mistake_count: 0,
    session_uid: "seed-session-2",
    content_hash: lessonHashById.get(1) ?? "",
    sync_state: "SYNCED",
    updated_at: "2026-06-11T09:04:00Z"
  })
];

export const seedAnswerRecords: AnswerRecord[] = [
  createDefaultAnswerRecord({
    id: 1,
    session_id: 1,
    symbol_id: 1,
    user_answer: "a",
    correct: true,
    latency_ms: 1200,
    mistake_reason: "",
    session_uid: "seed-session-1",
    record_uid: "seed-record-1",
    answered_at: "2026-06-10T09:01:00Z",
    sync_state: "SYNCED",
    updated_at: "2026-06-10T09:01:00Z"
  }),
  createDefaultAnswerRecord({
    id: 2,
    session_id: 1,
    symbol_id: 2,
    user_answer: "p",
    correct: false,
    latency_ms: 2600,
    mistake_reason: "DOT_MISS",
    session_uid: "seed-session-1",
    record_uid: "seed-record-2",
    answered_at: "2026-06-10T09:02:00Z",
    sync_state: "SYNCED",
    updated_at: "2026-06-10T09:02:00Z"
  }),
  createDefaultAnswerRecord({
    id: 3,
    session_id: 1,
    symbol_id: 3,
    user_answer: "c",
    correct: true,
    latency_ms: 1500,
    mistake_reason: "",
    session_uid: "seed-session-1",
    record_uid: "seed-record-3",
    answered_at: "2026-06-10T09:03:00Z",
    sync_state: "SYNCED",
    updated_at: "2026-06-10T09:03:00Z"
  }),
  createDefaultAnswerRecord({
    id: 4,
    session_id: 2,
    symbol_id: 1,
    user_answer: "1",
    correct: true,
    latency_ms: 900,
    mistake_reason: "",
    session_uid: "seed-session-2",
    record_uid: "seed-record-4",
    answered_at: "2026-06-11T09:01:00Z",
    sync_state: "SYNCED",
    updated_at: "2026-06-11T09:01:00Z"
  }),
  createDefaultAnswerRecord({
    id: 5,
    session_id: 2,
    symbol_id: 2,
    user_answer: "1,2",
    correct: true,
    latency_ms: 1100,
    mistake_reason: "",
    session_uid: "seed-session-2",
    record_uid: "seed-record-5",
    answered_at: "2026-06-11T09:02:00Z",
    sync_state: "SYNCED",
    updated_at: "2026-06-11T09:02:00Z"
  })
];
