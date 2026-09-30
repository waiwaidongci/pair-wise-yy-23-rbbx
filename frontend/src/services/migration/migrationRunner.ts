import { SYNC_CONFIG } from "../../constants/syncConfig";
import { logOperation } from "../../utils/logger";
import { idbGetAll, idbPut, idbPutMany } from "../db";
import { migrateLegacyRows, type LegacyRow } from "./legacyNormalizer";

/**
 * 历史数据缺少同步标识时先兼容迁移：
 * 遍历四类实体表，旧行补齐 uid/revision/content_hash 与字段类型，迁移完成后写入 meta 标记。
 */
export async function runLegacyMigration(): Promise<{ migrated: number }> {
  const done = await idbGetAll("meta").then((rows) => rows.some((row) => row.key === SYNC_CONFIG.metaKeys.migrated));
  if (done) return { migrated: 0 };

  const tables = ["brailleSymbol", "lesson", "practiceSession", "answerRecord"] as const;
  let migratedTotal = 0;

  for (const table of tables) {
    const rows = (await idbGetAll(table)) as unknown as LegacyRow[];
    if (rows.length === 0) continue;
    const { migrated } = migrateLegacyRows(rows);
    if (migrated > 0) {
      await idbPutMany(table, rows as never);
      migratedTotal += migrated;
    }
  }

  await idbPut("meta", { key: SYNC_CONFIG.metaKeys.migrated, value: new Date().toISOString() });
  if (migratedTotal > 0) logOperation("PracticeSession", 0, { migrated: migratedTotal, note: "历史数据兼容迁移完成" });
  return { migrated: migratedTotal };
}
