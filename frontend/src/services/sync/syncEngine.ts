import { SYNC_CONFIG } from "../../constants/syncConfig";
import { ERROR_CODES } from "../../constants/errorCodes";
import { ERROR_MESSAGES } from "../../constants/errorMessages";
import { consumeFailNext } from "../../api/server/failureSimulator";
import { fetchServerState, processOutboxItem } from "../../api/server/mergeEngine";
import { isOnline } from "../../api/server/network";
import { MockServerError } from "../../api/server/types";
import type { AnswerRecord } from "../../types/AnswerRecord";
import type { BrailleSymbol } from "../../types/BrailleSymbol";
import type { EntityName } from "../../types/EntityName";
import type { Lesson } from "../../types/Lesson";
import type { PracticeSession } from "../../types/PracticeSession";
import type { SyncConflict } from "../../types/SyncConflict";
import type { SyncOutboxItem } from "../../types/SyncOutboxItem";
import type { SyncReport } from "../../types/SyncReport";
import { idbDelete, idbGetAll, idbPut, idbPutMany } from "../db";
import { logError, logOperation } from "../../utils/logger";
import { createUid } from "../../utils/uid";

function emptyReport(): SyncReport {
  return { ok: 0, failed: 0, conflicts: 0, merged: 0, stale: 0, errors: [], finished_at: "" };
}

/**
 * 可恢复离线训练的同步引擎：
 * 断网 -> 写操作全部留在 outbox；回网 -> 按 seq 顺序 flush，成功一项删一项（断点续传）；
 * 同 op_id 服务端只收一次；冲突进 conflicts 表；回拉后按 uid 合并并对失效会话重算。
 */
export const syncEngine = {
  async flush(): Promise<SyncReport> {
    const report = emptyReport();

    if (!isOnline()) {
      report.errors.push({
        entity: "PracticeSession",
        entity_id: 0,
        code: ERROR_CODES.NETWORK_OFFLINE,
        message: ERROR_MESSAGES.NETWORK_OFFLINE
      });
      report.failed += 1;
      report.finished_at = new Date().toISOString();
      return report;
    }

    const queue = (await idbGetAll("outbox")).sort((a, b) => a.seq - b.seq);
    for (const item of queue) {
      if (item.state === "IN_FLIGHT") {
        // 上次中断在“同步中”，断点续传时重新发送（服务端按 op_id 幂等，重复发送安全）
        item.state = "QUEUED";
      }
      if (item.state !== "QUEUED" && item.state !== "FAILED") continue;

      await idbPut("outbox", { ...item, state: "IN_FLIGHT", attempts: item.attempts + 1, updated_at: new Date().toISOString() });

      try {
        if (consumeFailNext()) {
          throw new MockServerError(ERROR_CODES.SYNC_WRITE_FAILED, "模拟服务端写入失败（500）", 500);
        }
        const result = processOutboxItem({ ...item, state: "QUEUED" });
        if (result.deduped) {
          // 重复同步：服务端只收一次，本地也只清理一次队列
          logOperation(item.entity, 5, { op_id: item.op_id, deduped: true });
        }
        if (result.entity === "PracticeSession" && result.mergedRecords && result.mergedRecords.length > 0) {
          report.merged += result.mergedRecords.length;
        }
        report.ok += 1;
        await idbDelete("outbox", item.op_id);
      } catch (error) {
        const handled = await this.handleFlushError(item, error, report);
        if (!handled.continue) break;
      }
    }

    const { stale } = await this.reconcileWithServer();
    report.stale = stale;
    report.finished_at = new Date().toISOString();
    await idbPut("meta", { key: SYNC_CONFIG.metaKeys.lastFlushAt, value: report.finished_at });
    return report;
  },

  async handleFlushError(item: SyncOutboxItem, error: unknown, report: SyncReport): Promise<{ continue: boolean }> {
    const isServerError = error instanceof MockServerError;
    const code = isServerError ? error.code : ERROR_CODES.SYNC_WRITE_FAILED;
    const message = isServerError ? error.message : ERROR_MESSAGES.SYNC_WRITE_FAILED;

    if (code === ERROR_CODES.VERSION_CONFLICT || code === ERROR_CODES.RECORD_MERGE_CONFLICT) {
      // 冲突：出队列、落冲突表，页面处理完才能继续练习
      await idbPut("outbox", {
        ...item,
        state: "CONFLICT",
        last_error_code: code,
        last_error_message: message,
        updated_at: new Date().toISOString()
      });
      await this.registerConflict(item, error, code, message);
      report.conflicts += 1;
      logError(code, message, { op_id: item.op_id });
      return { continue: true };
    }

    const exhausted = item.attempts + 1 >= SYNC_CONFIG.maxAttempts;
    await idbPut("outbox", {
      ...item,
      state: "FAILED",
      last_error_code: code,
      last_error_message: message,
      updated_at: new Date().toISOString()
    });
    report.failed += 1;
    report.errors.push({ entity: item.entity, entity_id: item.entity_id, code, message });
    logError(code, message, { op_id: item.op_id, attempts: item.attempts + 1 });

    // 写入失败保留队列，从下一项继续尝试；失败项等待下次 flush 断点续传
    if (exhausted) {
      logError(code, "已达最大重试次数，队列保留等待手动续传", { op_id: item.op_id });
    }
    return { continue: true };
  },

  async registerConflict(item: SyncOutboxItem, error: unknown, code: string, reason: string) {
    const serverState = fetchServerState();
    const remotePayload =
      item.entity === "Lesson"
        ? serverState.lessons.find((row) => row.id === item.entity_id)
        : serverState.answerRecords.find((row) =>
            code === ERROR_CODES.RECORD_MERGE_CONFLICT
              ? row.symbol_id === (JSON.parse(item.payload) as AnswerRecord).symbol_id &&
                row.session_uid === (JSON.parse(item.payload) as AnswerRecord).session_uid
              : row.record_uid === item.entity_uid
          );

    const existing = (await idbGetAll("conflicts")).find(
      (conflict) =>
        conflict.status === "OPEN" &&
        conflict.entity === item.entity &&
        conflict.entity_id === item.entity_id
    );

    const conflict: SyncConflict = existing ?? {
      id: createUid("conflict"),
      entity: item.entity,
      entity_id: item.entity_id,
      entity_uid: item.entity_uid,
      local_payload: item.payload,
      remote_payload: JSON.stringify(remotePayload ?? {}),
      error_code: code,
      reason,
      status: "OPEN",
      created_at: new Date().toISOString(),
      resolved_at: ""
    };

    if (existing) {
      existing.local_payload = item.payload;
      existing.remote_payload = JSON.stringify(remotePayload ?? {});
    }
    await idbPut("conflicts", conflict);
    await this.markEntityConflict(item);
  },

  async markEntityConflict(item: SyncOutboxItem) {
    const tables = {
      BrailleSymbol: "brailleSymbol",
      Lesson: "lesson",
      PracticeSession: "practiceSession",
      AnswerRecord: "answerRecord"
    } as const;
    const table = tables[item.entity];
    const rows = (await idbGetAll(table)) as Array<{ id: number; sync_state: string }>;
    const target = rows.find((row) => row.id === item.entity_id);
    if (target) {
      target.sync_state = "CONFLICT";
      await idbPutMany(table, rows as never);
    }
  },

  /** 回拉服务端全量数据并按 uid 合并到本地；随后重算课程变化导致的失效会话 */
  async reconcileWithServer(): Promise<{ stale: number }> {
    const remote = fetchServerState();

    // 本地待同步行（仍在 outbox 中）保留本地版本，不能被远端整表覆盖掉
    const openQueue = (await idbGetAll("outbox")).filter((item) => item.state !== "CONFLICT");
    const pendingLessonIds = new Set(
      openQueue.filter((item) => item.entity === "Lesson").map((item) => item.entity_id)
    );
    const pendingSymbolIds = new Set(
      openQueue.filter((item) => item.entity === "BrailleSymbol").map((item) => item.entity_id)
    );
    await this.upsertCanonical(
      "brailleSymbol",
      this.mergeByNumericId(await idbGetAll("brailleSymbol"), remote.brailleSymbols, pendingSymbolIds)
    );
    await this.upsertCanonical(
      "lesson",
      this.mergeByNumericId(await idbGetAll("lesson"), remote.lessons, pendingLessonIds)
    );

    const localSessions = await idbGetAll("practiceSession");
    const localRecords = await idbGetAll("answerRecord");
    const remoteSessionByUid = new Map(remote.practiceSessions.map((session) => [session.session_uid, session]));
    const remoteRecordByUid = new Map(remote.answerRecords.map((record) => [record.record_uid, record]));

    const pendingSessionUids = new Set(
      openQueue.filter((item) => item.entity === "PracticeSession").map((item) => item.entity_uid)
    );
    const pendingRecordUids = new Set(
      openQueue.filter((item) => item.entity === "AnswerRecord").map((item) => item.entity_uid)
    );

    // 会话按 session_uid 换号合并：临时负数 id 替换为服务端权威 id，旧临时行登记删除
    const sessionUidToCanonicalId = new Map<string, number>();
    const obsoleteSessionIds = new Set<number>();
    const mergedSessions: PracticeSession[] = localSessions.map((session) => {
      const canonical = remoteSessionByUid.get(session.session_uid);
      if (!canonical || pendingSessionUids.has(session.session_uid)) return session;
      sessionUidToCanonicalId.set(session.session_uid, canonical.id);
      if (session.id !== canonical.id) obsoleteSessionIds.add(session.id);
      return { ...canonical };
    });
    for (const remoteSession of remote.practiceSessions) {
      if (!localSessions.some((session) => session.session_uid === remoteSession.session_uid)) {
        mergedSessions.push({ ...remoteSession });
        sessionUidToCanonicalId.set(remoteSession.session_uid, remoteSession.id);
      }
    }

    // 答题记录按 record_uid 换号；会话换号后同步修正 session_id；旧临时行登记删除
    const obsoleteRecordIds = new Set<number>();
    const mergedRecords: AnswerRecord[] = localRecords.map((record) => {
      const canonical = remoteRecordByUid.get(record.record_uid);
      const canonicalSessionId = sessionUidToCanonicalId.get(record.session_uid);
      if (!canonical || pendingRecordUids.has(record.record_uid)) {
        return canonicalSessionId && !pendingSessionUids.has(record.session_uid)
          ? { ...record, session_id: canonicalSessionId }
          : record;
      }
      if (record.id !== canonical.id) obsoleteRecordIds.add(record.id);
      return { ...canonical, session_id: canonicalSessionId ?? canonical.session_id };
    });
    for (const remoteRecord of remote.answerRecords) {
      if (!localRecords.some((record) => record.record_uid === remoteRecord.record_uid)) {
        mergedRecords.push({
          ...remoteRecord,
          session_id: sessionUidToCanonicalId.get(remoteRecord.session_uid) ?? remoteRecord.session_id
        });
      }
    }

    // 课程内容变化后：旧会话与相关答题记录标记 STALE，历史结果失效，进度/错题只算有效记录
    const lessons = await idbGetAll("lesson");
    const lessonHashById = new Map(lessons.map((lesson) => [lesson.id, lesson.content_hash]));
    let stale = 0;
    for (const session of mergedSessions) {
      const latestHash = lessonHashById.get(session.lesson_id);
      if (latestHash && session.content_hash && latestHash !== session.content_hash && session.sync_state !== "STALE") {
        session.sync_state = "STALE";
        stale += 1;
        logOperation("PracticeSession", 6, { session_uid: session.session_uid, lesson_id: session.lesson_id });
      }
    }
    const staleSessionUids = new Set(mergedSessions.filter((session) => session.sync_state === "STALE").map((session) => session.session_uid));
    for (const record of mergedRecords) {
      if (staleSessionUids.has(record.session_uid) && record.sync_state !== "STALE") {
        record.sync_state = "STALE";
      }
    }

    await idbPutMany("practiceSession", mergedSessions);
    await idbPutMany("answerRecord", mergedRecords);
    // 清理换号后残留的负数临时行，避免本地统计出现孤儿记录
    for (const id of obsoleteSessionIds) await idbDelete("practiceSession", id);
    for (const id of obsoleteRecordIds) await idbDelete("answerRecord", id);
    return { stale };
  },

  /** 数字主键表按 id 合并：待同步的本地行保留，远端新增行补入，其余采用权威版本 */
  mergeByNumericId<T extends { id: number }>(local: T[], remote: T[], pendingIds: Set<number>): T[] {
    const merged = local.map((row) => {
      if (pendingIds.has(row.id)) return row;
      return remote.find((candidate) => candidate.id === row.id) ?? row;
    });
    for (const remoteRow of remote) {
      if (!local.some((row) => row.id === remoteRow.id)) merged.push(remoteRow);
    }
    return merged;
  },

  async upsertCanonical<S extends "brailleSymbol" | "lesson">(store: S, rows: BrailleSymbol[] | Lesson[]) {
    await idbPutMany(store, rows as never);
  }
};
