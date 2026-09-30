import { create } from "zustand";
import { listLesson, saveLesson, type SaveLessonResult } from "../api/Lesson";
import type { Lesson } from "../types/Lesson";

type State = {
  rows: Lesson[];
  loading: boolean;
  load: () => Promise<void>;
  save: (lesson: Lesson) => Promise<SaveLessonResult>;
};

export const useLessonStore = create<State>((set, get) => ({
  rows: [],
  loading: false,
  async load() {
    set({ loading: true });
    const rows = await listLesson();
    set({ rows, loading: false });
  },
  async save(lesson) {
    const result = await saveLesson(lesson);
    await get().load();
    return result;
  }
}));
