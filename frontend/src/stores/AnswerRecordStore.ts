import { create } from "zustand";
import { listAnswerRecord, saveAnswerRecord } from "../api/AnswerRecord";
import type { AnswerRecord } from "../types/AnswerRecord";

type State = {
  rows: AnswerRecord[];
  loading: boolean;
  load: () => Promise<void>;
  save: (record: AnswerRecord) => Promise<AnswerRecord>;
};

export const useAnswerRecordStore = create<State>((set, get) => ({
  rows: [],
  loading: false,
  async load() {
    set({ loading: true });
    const rows = await listAnswerRecord();
    set({ rows, loading: false });
  },
  async save(record) {
    const saved = await saveAnswerRecord(record);
    await get().load();
    return saved;
  }
}));
