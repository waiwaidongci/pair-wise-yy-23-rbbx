import { idbGetAll, idbPutMany } from "./db";
import { runLegacyMigration } from "./migration/migrationRunner";
import { syncEngine } from "./sync/syncEngine";
import {
  seedAnswerRecords,
  seedBrailleSymbols,
  seedLessons,
  seedPracticeSessions
} from "../mocks/seedData";

/** 首次启动：历史数据先兼容迁移，本地为空时落规范种子，然后回拉合并并尝试 flush */
export async function bootstrapLocalDatabase(): Promise<{ migrated: number; seeded: boolean }> {
  const { migrated } = await runLegacyMigration();

  const existing = {
    brailleSymbol: await idbGetAll("brailleSymbol"),
    lesson: await idbGetAll("lesson"),
    practiceSession: await idbGetAll("practiceSession"),
    answerRecord: await idbGetAll("answerRecord")
  };
  const total =
    existing.brailleSymbol.length + existing.lesson.length + existing.practiceSession.length + existing.answerRecord.length;

  if (total === 0) {
    await idbPutMany("brailleSymbol", structuredClone(seedBrailleSymbols));
    await idbPutMany("lesson", structuredClone(seedLessons));
    await idbPutMany("practiceSession", structuredClone(seedPracticeSessions));
    await idbPutMany("answerRecord", structuredClone(seedAnswerRecords));
  }

  await syncEngine.reconcileWithServer();
  return { migrated, seeded: total === 0 };
}
