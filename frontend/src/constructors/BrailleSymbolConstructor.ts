import type { BrailleSymbol } from "../types/BrailleSymbol";

export const createDefaultBrailleSymbol = (overrides: Partial<BrailleSymbol> = {}): BrailleSymbol => ({
  id: -1,
  cell_pattern: "",
  letter: "",
  pinyin: "",
  category: "LETTER",
  difficulty: "1",
  audio_hint_key: "",
  revision: 0,
  sync_state: "NEW_LOCAL",
  updated_at: new Date(0).toISOString(),
  ...overrides
});

export const createBrailleSymbolForm = createDefaultBrailleSymbol;
export const createBrailleSymbolResponse = createDefaultBrailleSymbol;
