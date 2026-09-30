/**
 * 课程内容版本服务。
 *
 * 课程内容（symbol_ids）变化后，已有会话引用的 lesson_version 会落后，
 * 此时旧成绩作废、进度重算。这里统一负责指纹计算与失效标记。
 */
import { STORES, getAll, putMany } from "../db";
import type { Lesson } from "../types/Lesson";
import type { PracticeSession } from "../types/PracticeSession";
import type { AnswerRecord } from "../types/AnswerRecord";
import { computeContentHash, isLessonVersionStale } from "../utils/hash";
import { LOG_TEMPLATES } from "../constants/logTemplates";

/** 计算课程当前内容指纹 */
export function lessonHash(lesson: Pick<Lesson, "title" | "symbol_ids">): string {
  return computeContentHash(lesson);
}

/** 判定会话是否已落后于当前课程内容 */
export function isSessionStale(session: PracticeSession, lesson: Lesson | undefined): boolean {
  if (!lesson) return false;
  return isLessonVersionStale(session.lesson_version, lesson.content_hash ?? lessonHash(lesson));
}

/**
 * 课程内容变更后，重算该课程下所有会话/记录的失效状态。
 * 返回被标记为失效的会话数。
 */
export async function recomputeStaleForLesson(lesson: Lesson): Promise<number> {
  const [sessions, records] = await Promise.all([
    getAll<PracticeSession>(STORES.SESSIONS),
    getAll<AnswerRecord>(STORES.ANSWER_RECORDS)
  ]);
  const currentHash = lesson.content_hash ?? lessonHash(lesson);
  let staleCount = 0;

  const updatedSessions = sessions.map((s) => {
    if (s.lesson_id !== lesson.id) return s;
    const stale = isLessonVersionStale(s.lesson_version, currentHash);
    if (stale) staleCount += 1;
    return { ...s, stale };
  });

  // 记录随会话一起失效：同课程、且版本落后的记录标记 stale（通过 lesson_version 比对）
  const updatedRecords = records.map((r) => {
    if (r.lesson_version && isLessonVersionStale(r.lesson_version, currentHash)) {
      return { ...r, stale: true } as AnswerRecord & { stale?: boolean };
    }
    return r;
  });

  await putMany(STORES.SESSIONS, updatedSessions);
  await putMany(STORES.ANSWER_RECORDS, updatedRecords);
  if (staleCount > 0) {
    console.info(`[Migration] ${LOG_TEMPLATES.Migration[3]}：课程 ${lesson.id} 有 ${staleCount} 个旧会话失效`);
  }
  return staleCount;
}

/** 批量重算所有课程的会话失效状态（迁移/启动时用） */
export async function recomputeAllStale(
  lessons: Lesson[],
  sessions: PracticeSession[],
  records: AnswerRecord[]
): Promise<{ sessions: PracticeSession[]; records: AnswerRecord[]; staleCount: number }> {
  const hashById = new Map<number, string>();
  lessons.forEach((l) => hashById.set(l.id, l.content_hash ?? lessonHash(l)));

  let staleCount = 0;
  const updatedSessions = sessions.map((s) => {
    const hash = hashById.get(s.lesson_id);
    const stale = hash ? isLessonVersionStale(s.lesson_version, hash) : false;
    if (stale) staleCount += 1;
    return { ...s, stale };
  });
  const updatedRecords = records.map((r) => {
    const hash = hashById.get(
      sessions.find((s) => s.id === r.session_id)?.lesson_id ?? -1
    );
    const stale = r.lesson_version && hash ? isLessonVersionStale(r.lesson_version, hash) : false;
    return { ...r, ...(stale ? { stale: true } : {}) } as AnswerRecord;
  });

  return { sessions: updatedSessions, records: updatedRecords, staleCount };
}
