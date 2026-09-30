import { ERROR_CODES } from "../../constants/errorCodes";
import { ERROR_MESSAGES } from "../../constants/errorMessages";
import { hashLessonContent } from "../../utils/hash";
import type { AnswerRecord } from "../../types/AnswerRecord";
import type { BrailleSymbol } from "../../types/BrailleSymbol";
import type { EntityName } from "../../types/EntityName";
import type { Lesson } from "../../types/Lesson";
import type { PracticeSession } from "../../types/PracticeSession";
import type { SyncOutboxItem } from "../../types/SyncOutboxItem";
import { readServerState, mutateServerState } from "./serverStore";
import { MockServerError, type MockServerState, type SaveResult } from "./types";

/** 服务端重算会话汇总：成绩/错题数始终以合并后的答题记录为准，避免会话整体覆盖答题记录 */
function recomputeSession(session: PracticeSession, records: AnswerRecord[]): PracticeSession {
  const sessionRecords = records.filter((record) => record.session_uid === session.session_uid);
  if (sessionRecords.length === 0) return session;
  const mistakeCount = sessionRecords.filter((record) => !record.correct).length;
  const correctCount = sessionRecords.length - mistakeCount;
  const timestamps = sessionRecords.map((record) => record.answered_at).sort();
  return {
    ...session,
    score: Math.round((correctCount / sessionRecords.length) * 100),
    mistake_count: mistakeCount,
    started_at: timestamps[0] ?? session.started_at,
    finished_at: timestamps[timestamps.length - 1] ?? session.finished_at
  };
}

/** 同一道题存在不同作答 -> 冲突；答案一致则后续按 record_uid 幂等去重 */
function findConflictRecord(records: AnswerRecord[], incoming: AnswerRecord): AnswerRecord | undefined {
  return records.find(
    (record) =>
      record.record_uid !== incoming.record_uid &&
      record.session_uid === incoming.session_uid &&
      record.symbol_id === incoming.symbol_id &&
      record.user_answer !== incoming.user_answer
  );
}

/** 课程内容变化后由服务端权威重算 hash 与 revision；基于旧 revision 保存会抛 VERSION_CONFLICT */
function applyLessonSave(existing: Lesson | undefined, incoming: Lesson, force: boolean): Lesson {
  if (existing && incoming.revision !== existing.revision && !force) {
    throw new MockServerError(ERROR_CODES.VERSION_CONFLICT, ERROR_MESSAGES.VERSION_CONFLICT, 409, {
      local_revision: incoming.revision,
      remote_revision: existing.revision
    });
  }
  const nextRevision = existing
    ? force
      ? Math.max(existing.revision, incoming.revision) + 1
      : existing.revision + 1
    : Math.max(incoming.revision, 1);
  return { ...incoming, id: existing ? existing.id : incoming.id, content_hash: hashLessonContent(incoming), revision: nextRevision, sync_state: "SYNCED" };
}

/** 两个标签页同做一门课：会话按 session_uid 定位，答题记录按 record_uid 合并，而不是整会话覆盖 */
function applySessionSave(
  state: Pick<MockServerState, "practiceSessions" | "answerRecords">,
  incoming: PracticeSession
): PracticeSession {
  const existing = state.practiceSessions.find((item) => item.session_uid === incoming.session_uid);
  const base: PracticeSession = existing
    ? {
        ...existing,
        lesson_id: incoming.lesson_id || existing.lesson_id,
        lesson_revision: Math.max(existing.lesson_revision, incoming.lesson_revision),
        content_hash: incoming.content_hash || existing.content_hash,
        started_at: existing.started_at < incoming.started_at ? existing.started_at : incoming.started_at,
        finished_at: existing.finished_at > incoming.finished_at ? existing.finished_at : incoming.finished_at
      }
    : { ...incoming, id: nextPracticeSessionId(state.practiceSessions) };
  return { ...recomputeSession(base, state.answerRecords), sync_state: "SYNCED" };
}

function nextPracticeSessionId(sessions: PracticeSession[]): number {
  return sessions.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

function nextAnswerRecordId(records: AnswerRecord[]): number {
  return records.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

/** 记录可能先于会话到达（乱序）：挂到占位会话，会话同步时再补全元数据 */
function ensureParentSession(
  state: Pick<MockServerState, "practiceSessions">,
  incoming: AnswerRecord
): PracticeSession {
  const existing = state.practiceSessions.find((session) => session.session_uid === incoming.session_uid);
  if (existing) return existing;
  const placeholder: PracticeSession = {
    id: nextPracticeSessionId(state.practiceSessions),
    lesson_id: -1,
    lesson_revision: 0,
    mode: "MIXED",
    started_at: incoming.answered_at,
    finished_at: incoming.answered_at,
    score: 0,
    mistake_count: 0,
    session_uid: incoming.session_uid,
    content_hash: "",
    sync_state: "SYNCED",
    updated_at: incoming.answered_at
  };
  state.practiceSessions.push(placeholder);
  return placeholder;
}

function applyAnswerRecordSave(
  state: Pick<MockServerState, "practiceSessions" | "answerRecords">,
  incoming: AnswerRecord,
  force: boolean
): AnswerRecord {
  const conflict = findConflictRecord(state.answerRecords, incoming);
  if (conflict && !force) {
    throw new MockServerError(ERROR_CODES.RECORD_MERGE_CONFLICT, ERROR_MESSAGES.RECORD_MERGE_CONFLICT, 409, {
      record_uid: conflict.record_uid,
      local_answer: incoming.user_answer,
      remote_answer: conflict.user_answer
    });
  }

  const sameUid = state.answerRecords.find((record) => record.record_uid === incoming.record_uid);
  const canonical: AnswerRecord = sameUid
    ? { ...sameUid, ...incoming, id: sameUid.id, sync_state: "SYNCED" }
    : { ...incoming, id: nextAnswerRecordId(state.answerRecords), sync_state: "SYNCED" };
  upsertBy(state.answerRecords, canonical, (row) => row.record_uid === canonical.record_uid);

  // 强制覆盖（冲突处理选择保留本地）时旧作答不再保留 CONFLICT 标记
  if (conflict) {
    upsertBy(
      state.answerRecords,
      { ...conflict, sync_state: force ? "SYNCED" : "CONFLICT" },
      (row) => row.record_uid === conflict.record_uid
    );
  }

  const parent = ensureParentSession(state, incoming);
  upsertBy(state.practiceSessions, recomputeSession(parent, state.answerRecords), (row) => row.session_uid === parent.session_uid);
  return canonical;
}

/** 模拟一次服务端写入；同 op_id 重复同步直接返回首次结果，只收一次 */
export function processOutboxItem(item: SyncOutboxItem): SaveResult {
  const payload = JSON.parse(item.payload);
  let result: SaveResult | null = null;

  mutateServerState((state) => {
    const firstSeenAt = state.processedOps[item.op_id];
    if (firstSeenAt) {
      result = { entity: item.entity, canonical: readCanonical(item.entity, item, state), deduped: true };
      return;
    }

    switch (item.entity) {
      case "BrailleSymbol": {
        const incoming = payload as BrailleSymbol;
        const existing = state.brailleSymbols.find((row) => row.id === incoming.id);
        const canonical: BrailleSymbol = {
          ...incoming,
          id: existing ? existing.id : incoming.id,
          revision: existing ? existing.revision + 1 : Math.max(incoming.revision, 1),
          sync_state: "SYNCED"
        };
        upsertBy(state.brailleSymbols, canonical, (row) => row.id === canonical.id);
        result = { entity: item.entity, canonical, deduped: false };
        break;
      }
      case "Lesson": {
        const incoming = payload as Lesson;
        const existing = state.lessons.find((row) => row.id === incoming.id);
        const canonical = applyLessonSave(existing, incoming, item.force);
        upsertBy(state.lessons, canonical, (row) => row.id === canonical.id);
        result = { entity: item.entity, canonical, deduped: false };
        break;
      }
      case "PracticeSession": {
        const incoming = payload as PracticeSession;
        const canonicalSession = applySessionSave(state, incoming);
        upsertBy(state.practiceSessions, canonicalSession, (row) => row.session_uid === canonicalSession.session_uid);
        result = {
          entity: item.entity,
          canonical: canonicalSession,
          deduped: false,
          mergedRecords: state.answerRecords.filter((record) => record.session_uid === incoming.session_uid)
        };
        break;
      }
      case "AnswerRecord": {
        const incoming = payload as AnswerRecord;
        const canonicalRecord = applyAnswerRecordSave(state, incoming, item.force);
        result = { entity: item.entity, canonical: canonicalRecord, deduped: false };
        break;
      }
    }

    state.processedOps[item.op_id] = new Date().toISOString();
  });

  return result as unknown as SaveResult;
}

function readCanonical(entity: EntityName, item: SyncOutboxItem, state: MockServerState) {
  switch (entity) {
    case "BrailleSymbol":
      return state.brailleSymbols.find((row) => row.id === item.entity_id) as BrailleSymbol;
    case "Lesson":
      return state.lessons.find((row) => row.id === item.entity_id) as Lesson;
    case "PracticeSession":
      return state.practiceSessions.find((row) => row.session_uid === item.entity_uid) as PracticeSession;
    case "AnswerRecord":
      return state.answerRecords.find((row) => row.record_uid === item.entity_uid) as AnswerRecord;
  }
}

export function fetchServerState(): MockServerState {
  return readServerState();
}

function upsertBy<T>(rows: T[], row: T, predicate: (item: T) => boolean) {
  const index = rows.findIndex(predicate);
  if (index >= 0) rows[index] = row;
  else rows.push(row);
}
