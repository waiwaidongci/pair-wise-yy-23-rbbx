/**
 * 数据迁移服务。
 *
 * 历史数据（种子数据 / 旧版本本地记录）缺少同步标识：
 * - 没有 client_id（幂等键）→ 回填 uuid；
 * - 没有 sync_status → 视为已同步（SYNCED），不重复入队；
 * - 课程没有 content_hash → 计算内容指纹；
 * - 会话/记录没有 lesson_version → 回填当前课程指纹；
 * - 会话版本落后于课程 → 标记 stale 并重算进度。
 *
 * 迁移幂等：用 meta 表记录版本，重复启动不重复处理。
 */
import { STORES, getAll, putMany, getMeta, setMeta, clearStore } from "../db";
import type { Lesson } from "../types/Lesson";
import type { PracticeSession } from "../types/PracticeSession";
import type { AnswerRecord } from "../types/AnswerRecord";
import { SYNC_STATUS, type MigrationState } from "../types/sync";
import { createClientId } from "../utils/id";
import { lessonHash, recomputeAllStale } from "./lessonVersionService";
import { mockData } from "../mocks/seedData";
import { LOG_TEMPLATES } from "../constants/logTemplates";

export const MIGRATION_VERSION = 1;
const MIGRATION_META_KEY = "migration-state";

/** 本地为空时写入种子数据（首次启动） */
async function seedIfEmpty(): Promise<{ lessons: Lesson[]; sessions: PracticeSession[]; records: AnswerRecord[] }> {
  const [lessons, sessions, records] = await Promise.all([
    getAll<Lesson>(STORES.LESSONS),
    getAll<PracticeSession>(STORES.SESSIONS),
    getAll<AnswerRecord>(STORES.ANSWER_RECORDS)
  ]);

  if (lessons.length === 0) {
    await putMany(STORES.LESSONS, mockData.lesson as unknown as Lesson[]);
  }
  if (sessions.length === 0) {
    await putMany(STORES.SESSIONS, mockData.practiceSession as unknown as PracticeSession[]);
  }
  if (records.length === 0) {
    await putMany(STORES.ANSWER_RECORDS, mockData.answerRecord as unknown as AnswerRecord[]);
  }

  return {
    lessons: await getAll<Lesson>(STORES.LESSONS),
    sessions: await getAll<PracticeSession>(STORES.SESSIONS),
    records: await getAll<AnswerRecord>(STORES.ANSWER_RECORDS)
  };
}

export interface MigrationResult {
  migrated: boolean;
  legacy_backfilled: number;
  stale_count: number;
}

/** 执行迁移（幂等）。返回是否发生了迁移及回填条数。 */
export async function runMigration(): Promise<MigrationResult> {
  const prev = await getMeta<MigrationState>(MIGRATION_META_KEY);
  if (prev && prev.version >= MIGRATION_VERSION) {
    return { migrated: false, legacy_backfilled: prev.legacy_backfilled, stale_count: 0 };
  }

  console.info(`[Migration] ${LOG_TEMPLATES.Migration[0]} v${MIGRATION_VERSION}`);
  const { lessons, sessions, records } = await seedIfEmpty();

  let backfilled = 0;

  // 1) 课程：回填 content_hash + client_id + sync_status
  const migratedLessons = lessons.map((l) => {
    const patch: Partial<Lesson> = {};
    if (!l.content_hash) {
      patch.content_hash = lessonHash(l);
      backfilled += 1;
    }
    if (!l.client_id) {
      patch.client_id = createClientId();
      backfilled += 1;
    }
    if (!l.sync_status) {
      patch.sync_status = SYNC_STATUS.SYNCED;
      backfilled += 1;
    }
    return { ...l, ...patch };
  });

  // 2) 会话：回填 client_id / sync_status / lesson_version
  const migratedSessions = sessions.map((s) => {
    const patch: Partial<PracticeSession> = {};
    if (!s.client_id) {
      patch.client_id = createClientId();
      backfilled += 1;
    }
    if (!s.sync_status) {
      patch.sync_status = SYNC_STATUS.SYNCED;
      backfilled += 1;
    }
    if (!s.lesson_version) {
      const lesson = migratedLessons.find((l) => l.id === s.lesson_id);
      patch.lesson_version = lesson?.content_hash ?? lessonHash({ title: "", symbol_ids: [] });
      backfilled += 1;
    }
    return { ...s, ...patch };
  });

  // 3) 记录：回填 client_id / session_client_id / sync_status / lesson_version
  const migratedRecords = records.map((r) => {
    const patch: Partial<AnswerRecord> = {};
    if (!r.client_id) {
      patch.client_id = createClientId();
      backfilled += 1;
    }
    if (!r.sync_status) {
      patch.sync_status = SYNC_STATUS.SYNCED;
      backfilled += 1;
    }
    if (!r.session_client_id) {
      const session = migratedSessions.find((s) => s.id === r.session_id);
      if (session?.client_id) {
        patch.session_client_id = session.client_id;
        backfilled += 1;
      }
    }
    if (!r.lesson_version) {
      const session = migratedSessions.find((s) => s.id === r.session_id);
      if (session?.lesson_version) {
        patch.lesson_version = session.lesson_version;
        backfilled += 1;
      }
    }
    return { ...r, ...patch };
  });

  // 4) 课程版本重算：标记落后会话/记录失效
  const recomputed = await recomputeAllStale(migratedLessons, migratedSessions, migratedRecords);

  await putMany(STORES.LESSONS, migratedLessons);
  await putMany(STORES.SESSIONS, recomputed.sessions);
  await putMany(STORES.ANSWER_RECORDS, recomputed.records);

  await setMeta<MigrationState>(MIGRATION_META_KEY, {
    version: MIGRATION_VERSION,
    migrated_at: new Date().toISOString(),
    legacy_backfilled: backfilled
  });

  console.info(
    `[Migration] ${LOG_TEMPLATES.Migration[1]}：回填 ${backfilled} 条，${recomputed.staleCount} 个旧会话失效`
  );
  return { migrated: true, legacy_backfilled: backfilled, stale_count: recomputed.staleCount };
}

/** 重置迁移状态（调试用，下次启动重新迁移） */
export async function resetMigration(): Promise<void> {
  await clearStore(STORES.META);
}
