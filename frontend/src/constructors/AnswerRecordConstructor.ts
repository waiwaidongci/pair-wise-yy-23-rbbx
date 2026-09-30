import type { AnswerRecord } from "../types/AnswerRecord";

export const createDefaultAnswerRecord = (overrides: Partial<AnswerRecord> = {}): AnswerRecord => ({
  id: -1,
  session_id: -1,
  symbol_id: -1,
  user_answer: "",
  correct: false,
  latency_ms: 0,
  mistake_reason: "",
  session_uid: "",
  record_uid: "",
  answered_at: new Date(0).toISOString(),
  sync_state: "NEW_LOCAL",
  updated_at: new Date(0).toISOString(),
  ...overrides
});

export const createAnswerRecordForm = createDefaultAnswerRecord;
export const createAnswerRecordResponse = createDefaultAnswerRecord;
