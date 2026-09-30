/**
 * 同步服务（可恢复离线训练流程的核心）。
 *
 * 职责：
 * - 按检查点顺序处理 outbox（断点续传）；
 * - 成功 → 标记 SYNCED；
 * - 冲突 → 标记 CONFLICT 并暂停队列（需人工处理后再练习）；
 * - 失败 → 保留队列、记录原因与重试次数，暂停后续（断点续传）；
 * - 同步后下拉远端状态，按 client_id 合并到本地（答题记录取并集，不覆盖）；
 * - 提供冲突解决：放弃旧成绩 / 保留本地重推 / 采用远端。
 */
import { STORES, getAll, putMany, remove } from "../db";
import type { Lesson } from "../types/Lesson";
import type { PracticeSession } from "../types/PracticeSession";
import type { AnswerRecord } from "../types/AnswerRecord";
import {
  SYNC_STATUS,
  type OutboxItem,
  type SyncConflict,
  type ConflictReason
} from "../types/sync";
import { syncRemote, fetchRemoteState, setSimulateFailure } from "../api/sync";
import {
  listOutbox,
  updateItem,
  getCheckpoint,
  setCheckpoint,
  resetCheckpoint,
  markConflict,
  markFailed,
  removeItem
} from "./outboxService";
import { createSyncConflict } from "../constructors/SyncConstructor";
import { LOG_TEMPLATES } from "../constants/logTemplates";
import { isEffectiveOnline } from "../utils/network";

const MAX_RETRY = 5;

export interface SyncOutcome {
  synced: number;
  conflicts: SyncConflict[];
  failed: number;
  resumed_from: number;
  offline?: boolean;
}

/**
 * 执行一次同步。
 * 从检查点处继续，处理所有 pending 项；遇到冲突/失败即暂停，保证顺序与可恢复。
 * 离线（含强制离线演示开关）时不推送，队列原样保留，联网后自动续传。
 */
export async function syncNow(): Promise<SyncOutcome> {
  if (!isEffectiveOnline()) {
    console.info(`[Sync] ${LOG_TEMPLATES.Sync[7]}：离线状态，暂不推送`);
    return { synced: 0, conflicts: [], failed: 0, resumed_from: 0, offline: true };
  }

  const items = await listOutbox();
  const checkpoint = await getCheckpoint();
  const resumeFrom = checkpoint.last_processed_outbox_id;

  // 只处理检查点之后、仍处于待同步的项
  const pending = items.filter(
    (it) =>
      it.status === SYNC_STATUS.PENDING &&
      (it.id ?? 0) > resumeFrom
  );

  const conflicts: SyncConflict[] = [];
  let synced = 0;
  let failed = 0;
  let cursor = resumeFrom;

  if (pending.length === 0) {
    // 没有待推送项，仅下拉合并一次
    await pullMerge();
    return { synced: 0, conflicts: [], failed: 0, resumed_from: resumeFrom };
  }

  console.info(`[Sync] ${LOG_TEMPLATES.Sync[5]}：从 outbox #${resumeFrom} 继续，${pending.length} 项待处理`);

  try {
    const result = await syncRemote(pending);

    // 处理远端报告的冲突
    for (const c of result.conflicts) {
      const item = pending.find((p) => p.client_id === c.client_id);
      if (!item) continue;
      const conflict = createSyncConflict({
        client_id: c.client_id,
        entity_type: item.entity_type,
        reason: c.reason as ConflictReason,
        message: c.message,
        local_payload: item.payload,
        remote_payload: c.remote_payload
      });
      conflicts.push(conflict);
      await markConflict(c.client_id, conflict.reason, conflict.message);
      // 冲突项阻断队列：不推进检查点，等待人工处理
      failed += 1;
      break;
    }

    // 成功接受的项：标记 SYNCED 并推进检查点
    for (const clientId of result.accepted) {
      const item = pending.find((p) => p.client_id === clientId);
      if (!item) continue;
      await updateItem(item.id!, { status: SYNC_STATUS.SYNCED, last_error: null });
      synced += 1;
      cursor = Math.max(cursor, item.id!);
    }

    // 若中途冲突，检查点停在冲突项之前（断点续传）
    if (conflicts.length === 0) {
      await setCheckpoint(cursor);
    } else {
      // 冲突项之前的成功项已提交，检查点推进到冲突项之前
      const conflictItem = pending.find((p) => p.client_id === conflicts[0].client_id);
      if (conflictItem) {
        await setCheckpoint(Math.max(resumeFrom, (conflictItem.id ?? 1) - 1));
      }
    }

    // 下拉远端合并
    await pullMerge();
  } catch (err) {
    // 写入失败：保留队列，记录原因与重试次数，从断点续传
    const message = err instanceof Error ? err.message : "未知同步错误";
    const code = (err as { code?: string }).code;
    for (const item of pending) {
      const retry = (item.retry_count ?? 0) + 1;
      const status = retry >= MAX_RETRY ? SYNC_STATUS.FAILED : SYNC_STATUS.PENDING;
      await updateItem(item.id!, {
        status,
        retry_count: retry,
        last_error: code ? `${message}（${code}，第 ${retry} 次重试）` : `${message}（第 ${retry} 次重试）`
      });
      failed += 1;
      break; // 顺序处理：失败即停，后续项断点续传
    }
    console.warn(`[Sync] ${LOG_TEMPLATES.Sync[4]}：${message}`);
  }

  return { synced, conflicts, failed, resumed_from: resumeFrom };
}

/**
 * 下拉远端状态，按 client_id 合并到本地。
 * 答题记录取并集（两标签页的记录都保留），会话/课程按 client_id 存在即跳过。
 */
export async function pullMerge(): Promise<{ merged: number }> {
  const server = await fetchRemoteState();
  const [localLessons, localSessions, localRecords] = await Promise.all([
    getAll<Lesson>(STORES.LESSONS),
    getAll<PracticeSession>(STORES.SESSIONS),
    getAll<AnswerRecord>(STORES.ANSWER_RECORDS)
  ]);

  let merged = 0;

  const localLessonIds = new Set(localLessons.map((l) => l.client_id).filter(Boolean));
  const newLessons = server.lessons.filter((l) => l.client_id && !localLessonIds.has(l.client_id));
  if (newLessons.length) {
    await putMany(STORES.LESSONS, newLessons.map((l) => ({ ...l, sync_status: SYNC_STATUS.SYNCED })));
    merged += newLessons.length;
  }

  const localSessionIds = new Set(localSessions.map((s) => s.client_id).filter(Boolean));
  const newSessions = server.sessions.filter((s) => s.client_id && !localSessionIds.has(s.client_id));
  if (newSessions.length) {
    await putMany(STORES.SESSIONS, newSessions.map((s) => ({ ...s, sync_status: SYNC_STATUS.SYNCED })));
    merged += newSessions.length;
  }

  // 答题记录按 client_id 取并集——这是"不被盖掉"的关键
  const localRecordIds = new Set(localRecords.map((r) => r.client_id).filter(Boolean));
  const newRecords = server.answerRecords.filter((r) => r.client_id && !localRecordIds.has(r.client_id));
  if (newRecords.length) {
    await putMany(STORES.ANSWER_RECORDS, newRecords.map((r) => ({ ...r, sync_status: SYNC_STATUS.SYNCED })));
    merged += newRecords.length;
  }

  return { merged };
}

/**
 * 冲突解决。
 * - discard：放弃本地旧成绩（课程版本失效场景），删除 outbox 项，会话标记 stale；
 * - keep-local：保留本地内容，重置为待同步并重推（换新的 client_id 语义）；
 * - accept-remote：采用远端内容，删除本地对应记录与 outbox 项。
 */
export async function resolveConflict(
  clientId: string,
  action: "discard" | "keep-local" | "accept-remote"
): Promise<void> {
  const items = await listOutbox();
  const item = items.find((it) => it.client_id === clientId);
  if (!item) return;

  if (action === "discard") {
    // 课程版本失效：旧成绩作废，删除 outbox 项并把对应会话/记录标记 stale
    await removeItem(item.id!);
    if (item.entity_type === "PracticeSession") {
      const sessions = await getAll<PracticeSession>(STORES.SESSIONS);
      const target = sessions.find((s) => s.client_id === clientId);
      if (target) {
        await putMany(
          STORES.SESSIONS,
          sessions.map((s) => (s.id === target.id ? { ...s, stale: true, sync_status: SYNC_STATUS.SYNCED } : s))
        );
      }
    } else if (item.entity_type === "AnswerRecord") {
      const records = await getAll<AnswerRecord>(STORES.ANSWER_RECORDS);
      await putMany(
        STORES.ANSWER_RECORDS,
        records.map((r) => (r.client_id === clientId ? { ...r, stale: true, sync_status: SYNC_STATUS.SYNCED } : r))
      );
    }
  } else if (action === "keep-local") {
    // 保留本地：重置为待同步，下轮重推
    await updateItem(item.id!, {
      status: SYNC_STATUS.PENDING,
      retry_count: 0,
      last_error: null,
      conflict_reason: null
    });
  } else if (action === "accept-remote") {
    // 采用远端：删除本地 outbox 项与本地副本，随后 pullMerge 会把远端内容拉回
    await removeItem(item.id!);
    if (item.entity_type === "PracticeSession") {
      const sessions = await getAll<PracticeSession>(STORES.SESSIONS);
      const target = sessions.find((s) => s.client_id === clientId);
      if (target) {
        await remove(STORES.SESSIONS, target.id);
      }
    } else if (item.entity_type === "AnswerRecord") {
      const records = await getAll<AnswerRecord>(STORES.ANSWER_RECORDS);
      const target = records.find((r) => r.client_id === clientId);
      if (target) {
        await remove(STORES.ANSWER_RECORDS, target.id);
      }
    }
    await pullMerge();
  }

  // 冲突已处理，重置检查点让队列重新扫描
  await resetCheckpoint();
}

/** 失败项重试：重置为待同步并立即同步 */
export async function retryFailed(): Promise<SyncOutcome> {
  const items = await listOutbox();
  for (const it of items) {
    if (it.status === SYNC_STATUS.FAILED) {
      await updateItem(it.id!, { status: SYNC_STATUS.PENDING, retry_count: 0, last_error: null });
    }
  }
  setSimulateFailure(false);
  return syncNow();
}

/** 网络恢复时的自动同步入口（由 worker / online 事件触发） */
export async function resumeWhenOnline(isOnline: boolean): Promise<SyncOutcome | null> {
  if (!isOnline) return null;
  console.info(`[Sync] ${LOG_TEMPLATES.Sync[6]}`);
  return syncNow();
}
