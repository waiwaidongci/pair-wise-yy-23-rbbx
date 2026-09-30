import { hashLessonContent } from "../utils/hash";
import type { Lesson } from "../types/Lesson";

export const createDefaultLesson = (overrides: Partial<Lesson> = {}): Lesson => {
  const merged: Lesson = {
    id: -1,
    title: "",
    symbol_ids: [],
    stage: "入门",
    estimated_minutes: 10,
    unlock_rule: "NONE",
    content_hash: "",
    revision: 0,
    sync_state: "NEW_LOCAL",
    updated_at: new Date(0).toISOString(),
    ...overrides
  };
  if (!overrides.content_hash) merged.content_hash = hashLessonContent(merged);
  return merged;
};

export const createLessonForm = createDefaultLesson;
export const createLessonResponse = createDefaultLesson;
