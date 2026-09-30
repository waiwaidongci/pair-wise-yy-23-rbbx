import { create } from "zustand";
import { listPracticeSession, savePracticeSession } from "../api/PracticeSession";
import type { PracticeSession } from "../types/PracticeSession";

type State = {
  rows: PracticeSession[];
  loading: boolean;
  load: () => Promise<void>;
  save: (session: PracticeSession) => Promise<PracticeSession>;
};

export const usePracticeSessionStore = create<State>((set, get) => ({
  rows: [],
  loading: false,
  async load() {
    set({ loading: true });
    const rows = await listPracticeSession();
    set({ rows, loading: false });
  },
  async save(session) {
    const saved = await savePracticeSession(session);
    await get().load();
    return saved;
  }
}));
