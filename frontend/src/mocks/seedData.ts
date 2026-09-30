/**
 * 本地种子数据（历史数据）。
 *
 * 这些数据"缺少同步标识"（没有 client_id / sync_status / lesson_version），
 * 首次启动由迁移服务回填，用来演示"历史数据缺少同步标识时先兼容迁移"。
 */
export const mockData = {
  brailleSymbol: [
    { id: 1, cell_pattern: "1", letter: "a", pinyin: "a", category: "LETTER", difficulty: "LOW", audio_hint_key: "a" },
    { id: 2, cell_pattern: "1,2", letter: "b", pinyin: "b", category: "LETTER", difficulty: "LOW", audio_hint_key: "b" },
    { id: 3, cell_pattern: "1,4", letter: "c", pinyin: "c", category: "LETTER", difficulty: "MEDIUM", audio_hint_key: "c" },
    { id: 4, cell_pattern: "1,4,5", letter: "d", pinyin: "d", category: "LETTER", difficulty: "MEDIUM", audio_hint_key: "d" },
    { id: 5, cell_pattern: "1,5", letter: "e", pinyin: "e", category: "LETTER", difficulty: "LOW", audio_hint_key: "e" },
    { id: 6, cell_pattern: "1,2,4", letter: "f", pinyin: "f", category: "LETTER", difficulty: "MEDIUM", audio_hint_key: "f" },
    { id: 7, cell_pattern: "1,2,4,5", letter: "g", pinyin: "g", category: "LETTER", difficulty: "HIGH", audio_hint_key: "g" },
    { id: 8, cell_pattern: "1,2,5", letter: "h", pinyin: "h", category: "LETTER", difficulty: "MEDIUM", audio_hint_key: "h" },
    { id: 9, cell_pattern: "2,4", letter: "i", pinyin: "i", category: "LETTER", difficulty: "MEDIUM", audio_hint_key: "i" },
    { id: 10, cell_pattern: "2,4,5", letter: "j", pinyin: "j", category: "LETTER", difficulty: "HIGH", audio_hint_key: "j" },
    { id: 11, cell_pattern: "1,3,6", letter: "u", pinyin: "u", category: "LETTER", difficulty: "HIGH", audio_hint_key: "u" },
    { id: 12, cell_pattern: "1,2,3,5", letter: "r", pinyin: "r", category: "LETTER", difficulty: "HIGH", audio_hint_key: "r" }
  ],
  lesson: [
    { id: 1, title: "入门：a b e", symbol_ids: [1, 2, 5], stage: "入门", estimated_minutes: 5, unlock_rule: "默认解锁" },
    { id: 2, title: "进阶：c d f", symbol_ids: [3, 4, 6], stage: "进阶", estimated_minutes: 8, unlock_rule: "完成入门" },
    { id: 3, title: "高阶：g h i j", symbol_ids: [7, 8, 9, 10], stage: "高阶", estimated_minutes: 12, unlock_rule: "正确率≥80%" },
    { id: 4, title: "综合：u r", symbol_ids: [11, 12], stage: "综合", estimated_minutes: 10, unlock_rule: "完成进阶" }
  ],
  practiceSession: [
    { id: 1, lesson_id: 1, mode: "CELL_TO_TEXT", started_at: "2026-09-20T09:00:00Z", finished_at: "2026-09-20T09:04:00Z", score: 90, mistake_count: 1 },
    { id: 2, lesson_id: 1, mode: "CELL_TO_TEXT", started_at: "2026-09-22T10:00:00Z", finished_at: "2026-09-22T10:05:00Z", score: 100, mistake_count: 0 },
    { id: 3, lesson_id: 2, mode: "CELL_TO_TEXT", started_at: "2026-09-23T11:00:00Z", finished_at: "2026-09-23T11:08:00Z", score: 67, mistake_count: 2 },
    { id: 4, lesson_id: 3, mode: "CELL_TO_TEXT", started_at: "2026-09-25T14:00:00Z", finished_at: "2026-09-25T14:12:00Z", score: 75, mistake_count: 2 },
    { id: 5, lesson_id: 1, mode: "CELL_TO_TEXT", started_at: "2026-09-28T09:00:00Z", finished_at: "2026-09-28T09:06:00Z", score: 80, mistake_count: 1 }
  ],
  answerRecord: [
    { id: 1, session_id: 1, symbol_id: 1, user_answer: "a", correct: true, latency_ms: 1200, mistake_reason: null },
    { id: 2, session_id: 1, symbol_id: 2, user_answer: "e", correct: false, latency_ms: 2400, mistake_reason: "点阵识别错误" },
    { id: 3, session_id: 1, symbol_id: 5, user_answer: "e", correct: true, latency_ms: 900, mistake_reason: null },
    { id: 4, session_id: 2, symbol_id: 1, user_answer: "a", correct: true, latency_ms: 800, mistake_reason: null },
    { id: 5, session_id: 2, symbol_id: 2, user_answer: "b", correct: true, latency_ms: 950, mistake_reason: null },
    { id: 6, session_id: 2, symbol_id: 5, user_answer: "e", correct: true, latency_ms: 700, mistake_reason: null },
    { id: 7, session_id: 3, symbol_id: 3, user_answer: "c", correct: true, latency_ms: 1600, mistake_reason: null },
    { id: 8, session_id: 3, symbol_id: 4, user_answer: "f", correct: false, latency_ms: 2800, mistake_reason: "点阵识别错误" },
    { id: 9, session_id: 3, symbol_id: 6, user_answer: "d", correct: false, latency_ms: 2600, mistake_reason: "点阵识别错误" },
    { id: 10, session_id: 4, symbol_id: 7, user_answer: "g", correct: true, latency_ms: 1800, mistake_reason: null },
    { id: 11, session_id: 4, symbol_id: 8, user_answer: "h", correct: true, latency_ms: 1500, mistake_reason: null },
    { id: 12, session_id: 4, symbol_id: 9, user_answer: "i", correct: true, latency_ms: 1300, mistake_reason: null },
    { id: 13, session_id: 4, symbol_id: 10, user_answer: "j", correct: false, latency_ms: 3000, mistake_reason: "点阵识别错误" },
    { id: 14, session_id: 5, symbol_id: 1, user_answer: "a", correct: true, latency_ms: 1000, mistake_reason: null },
    { id: 15, session_id: 5, symbol_id: 2, user_answer: "b", correct: true, latency_ms: 1100, mistake_reason: null },
    { id: 16, session_id: 5, symbol_id: 5, user_answer: "a", correct: false, latency_ms: 2200, mistake_reason: "点阵识别错误" }
  ]
} as const;
