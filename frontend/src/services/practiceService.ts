import { idbGetAll, idbPutEntityWithOutbox } from "./db";
import { enqueueSave, nextTemporaryId } from "./queueManager";
import { createDefaultAnswerRecord } from "../constructors/AnswerRecordConstructor";
import { createDefaultPracticeSession } from "../constructors/PracticeSessionConstructor";
import { logOperation } from "../utils/logger";
import { createUid } from "../utils/uid";
import type { AnswerRecord } from "../types/AnswerRecord";
import type { Lesson } from "../types/Lesson";
import type { PracticeSession } from "../types/PracticeSession";

export interface AnswerInput {
  symbol_id: number;
  user_answer: string;
  correct: boolean;
  latency_ms: number;
  mistake_reason: string;
}

/**
 * 练习领域服务：断网时作答照常落 IndexedDB 并入 outbox；
 * 会话用 session_uid、每条记录用 record_uid 标识，回网后按答题记录合并而非整会话覆盖。
 */
export const practiceService = {
  async startSession(input: { lesson: Lesson; mode: string }): Promise<PracticeSession> {
    const now = new Date().toISOString();
    const id = await nextTemporaryId("practiceSession");
    const session = createDefaultPracticeSession({
      id,
      lesson_id: input.lesson.id,
      lesson_revision: input.lesson.revision,
      mode: input.mode,
      started_at: now,
      finished_at: now,
      score: 0,
      mistake_count: 0,
      session_uid: createUid("session"),
      content_hash: input.lesson.content_hash,
      sync_state: "PENDING",
      updated_at: now
    });
    const outbox = await enqueueSave({
      entity: "PracticeSession",
      entity_id: session.id,
      entity_uid: session.session_uid,
      payload: session
    });
    await idbPutEntityWithOutbox("practiceSession", session, outbox);
    logOperation("PracticeSession", 4, { session_uid: session.session_uid });
    return session;
  },

  /** 单条作答立即持久化并入队；即使写入服务端失败，本地记录与队列都不会丢 */
  async saveAnswer(session: PracticeSession, input: AnswerInput): Promise<AnswerRecord> {
    const now = new Date().toISOString();
    const id = await nextTemporaryId("answerRecord");
    const record = createDefaultAnswerRecord({
      id,
      session_id: session.id,
      symbol_id: input.symbol_id,
      user_answer: input.user_answer,
      correct: input.correct,
      latency_ms: input.latency_ms,
      mistake_reason: input.mistake_reason,
      session_uid: session.session_uid,
      record_uid: createUid("record"),
      answered_at: now,
      sync_state: "PENDING",
      updated_at: now
    });
    const outbox = await enqueueSave({
      entity: "AnswerRecord",
      entity_id: record.id,
      entity_uid: record.record_uid,
      payload: record
    });
    await idbPutEntityWithOutbox("answerRecord", record, outbox);
    logOperation("AnswerRecord", 4, { record_uid: record.record_uid });
    return record;
  },

  /** 会话结束：基于已保存的答题记录重算分数/错题数，再把汇总行入队同步 */
  async finishSession(sessionUid: string, records: AnswerRecord[]): Promise<PracticeSession> {
    const sessions = await idbGetAll("practiceSession");
    const session = sessions.find((item) => item.session_uid === sessionUid);
    if (!session) throw new Error(`practice session not found: ${sessionUid}`);
    const now = new Date().toISOString();
    const mistakeCount = records.filter((record) => !record.correct).length;
    const finished: PracticeSession = {
      ...session,
      finished_at: now,
      score: records.length ? Math.round(((records.length - mistakeCount) / records.length) * 100) : 0,
      mistake_count: mistakeCount,
      updated_at: now,
      sync_state: "PENDING"
    };
    const outbox = await enqueueSave({
      entity: "PracticeSession",
      entity_id: finished.id,
      entity_uid: finished.session_uid,
      payload: finished
    });
    await idbPutEntityWithOutbox("practiceSession", finished, outbox);
    logOperation("PracticeSession", 1, { session_uid: sessionUid });
    return finished;
  },

  async getSession(sessionUid: string): Promise<PracticeSession | undefined> {
    const sessions = await idbGetAll("practiceSession");
    return sessions.find((session) => session.session_uid === sessionUid);
  }
};
