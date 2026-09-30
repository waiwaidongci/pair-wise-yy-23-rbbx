import type { PracticeSession } from "../types/PracticeSession";

export const createDefaultPracticeSession = (overrides: Partial<PracticeSession> = {}): PracticeSession => ({
  id: -1,
  lesson_id: -1,
  lesson_revision: 0,
  mode: "MIXED",
  started_at: new Date(0).toISOString(),
  finished_at: new Date(0).toISOString(),
  score: 0,
  mistake_count: 0,
  session_uid: "",
  content_hash: "",
  sync_state: "NEW_LOCAL",
  updated_at: new Date(0).toISOString(),
  ...overrides
});

export const createPracticeSessionForm = createDefaultPracticeSession;
export const createPracticeSessionResponse = createDefaultPracticeSession;
