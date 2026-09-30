import { SYNC_CONFIG } from "../../constants/syncConfig";
import {
  seedAnswerRecords,
  seedBrailleSymbols,
  seedLessons,
  seedPracticeSessions
} from "../../mocks/seedData";
import type { MockServerState } from "./types";

function createSeedState(): MockServerState {
  return {
    brailleSymbols: structuredClone(seedBrailleSymbols),
    lessons: structuredClone(seedLessons),
    practiceSessions: structuredClone(seedPracticeSessions),
    answerRecords: structuredClone(seedAnswerRecords),
    processedOps: {}
  };
}

/** 读取跨标签页共享的服务端状态；首次访问时用规范种子初始化 */
export function readServerState(): MockServerState {
  const raw = localStorage.getItem(SYNC_CONFIG.serverStorageKey);
  if (!raw) {
    const seeded = createSeedState();
    writeServerState(seeded);
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<MockServerState>;
    return {
      brailleSymbols: parsed.brailleSymbols ?? [],
      lessons: parsed.lessons ?? [],
      practiceSessions: parsed.practiceSessions ?? [],
      answerRecords: parsed.answerRecords ?? [],
      processedOps: parsed.processedOps ?? {}
    };
  } catch {
    const seeded = createSeedState();
    writeServerState(seeded);
    return seeded;
  }
}

export function writeServerState(state: MockServerState) {
  localStorage.setItem(SYNC_CONFIG.serverStorageKey, JSON.stringify(state));
}

export function mutateServerState(mutate: (state: MockServerState) => void): MockServerState {
  const state = readServerState();
  mutate(state);
  // 已处理 op 列表只保留最近 500 条，防止无限增长
  const entries = Object.entries(state.processedOps);
  if (entries.length > 500) {
    state.processedOps = Object.fromEntries(
      entries.sort((a, b) => a[1].localeCompare(b[1])).slice(entries.length - 500)
    );
  }
  writeServerState(state);
  return state;
}
