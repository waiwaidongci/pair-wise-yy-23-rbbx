import { create } from "zustand";
import type { AnswerRecord } from "../types/AnswerRecord";
import type { PracticeSession } from "../types/PracticeSession";

/** 进行中的练习草稿：即使断网/刷新，已写入 IndexedDB 的记录仍可从这里恢复继续作答 */
export type PracticeDraft = {
  session: PracticeSession;
  records: AnswerRecord[];
  currentIndex: number;
} | null;

type DraftState = {
  draft: PracticeDraft;
  setDraft: (draft: PracticeDraft) => void;
  appendRecord: (record: AnswerRecord) => void;
  replaceSession: (session: PracticeSession) => void;
  clear: () => void;
};

export const usePracticeDraftStore = create<DraftState>((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
  appendRecord: (record) =>
    set((state) =>
      state.draft
        ? { draft: { ...state.draft, records: [...state.draft.records, record], currentIndex: state.draft.currentIndex + 1 } }
        : state
    ),
  replaceSession: (session) => set((state) => (state.draft ? { draft: { ...state.draft, session } } : state)),
  clear: () => set({ draft: null })
}));
