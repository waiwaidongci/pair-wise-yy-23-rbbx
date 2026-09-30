import type { SyncState } from "./SyncState";

export interface BrailleSymbol {
  id: number;
  cell_pattern: string;
  letter: string;
  pinyin: string;
  category: string;
  difficulty: string;
  audio_hint_key: string;
  revision: number;
  sync_state: SyncState;
  updated_at: string;
}
