/**
 * 远端"服务器"模拟。
 *
 * 纯前端项目没有真实后端，这里用 localStorage 模拟一台共享服务器：
 * 同一浏览器的多个标签页共享这份远端数据，正好对应"两个标签页做完同一课程"的场景。
 * 远端只按 client_id（幂等键）存记录，合并答题记录时取并集，绝不按本地自增 id 覆盖。
 */
import type { Lesson } from "../types/Lesson";
import type { PracticeSession } from "../types/PracticeSession";
import type { AnswerRecord } from "../types/AnswerRecord";
import { SYNC_STATUS, type SyncStatus } from "../types/sync";

const REMOTE_KEY = "braille-trainer:remote-store";

export interface RemoteState {
  lessons: Lesson[];
  sessions: PracticeSession[];
  answerRecords: AnswerRecord[];
  /** 已接收过的 client_id → 记录摘要（幂等去重依据） */
  seen: Record<string, { entity_type: string; updated_at: string; fingerprint: string }>;
}

const EMPTY: RemoteState = { lessons: [], sessions: [], answerRecords: [], seen: {} };

export function loadRemote(): RemoteState {
  if (typeof localStorage === "undefined") return { ...EMPTY, seen: {} };
  try {
    const raw = localStorage.getItem(REMOTE_KEY);
    if (!raw) return { ...EMPTY, seen: {} };
    const parsed = JSON.parse(raw) as Partial<RemoteState>;
    return {
      lessons: parsed.lessons ?? [],
      sessions: parsed.sessions ?? [],
      answerRecords: parsed.answerRecords ?? [],
      seen: parsed.seen ?? {}
    };
  } catch {
    return { ...EMPTY, seen: {} };
  }
}

function saveRemote(state: RemoteState): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(REMOTE_KEY, JSON.stringify(state));
}

/** 记录指纹：同 client_id 收到不同指纹即视为幂等冲突 */
function fingerprint(entity: { updated_at?: string } & Record<string, unknown>): string {
  const { client_id, sync_status, updated_at, ...rest } = entity as Record<string, unknown>;
  return JSON.stringify(rest);
}

export interface RemotePushResult {
  accepted: string[];
  conflicts: Array<{ client_id: string; reason: string; message: string; remote_payload: unknown }>;
}

/**
 * 远端写入：幂等合并。
 * - 没见过的 client_id：接收（accepted）。
 * - 见过且指纹一致：去重接收（重复同步只收一次，不重复入库）。
 * - 见过但指纹不一致：幂等冲突（IDEMPOTENT_MISMATCH）。
 * - 课程内容指纹落后于远端课程：版本失效冲突（LESSON_VERSION_STALE）。
 */
export function pushRemote(items: Array<{
  client_id: string;
  entity_type: string;
  payload: Record<string, unknown>;
}>): RemotePushResult {
  const state = loadRemote();
  const accepted: string[] = [];
  const conflicts: RemotePushResult["conflicts"] = [];

  for (const item of items) {
    const fp = fingerprint(item.payload);
    const seen = state.seen[item.client_id];

    if (seen) {
      if (seen.fingerprint === fp) {
        // 幂等去重：重复推送，只确认接收一次
        accepted.push(item.client_id);
        continue;
      }
      conflicts.push({
        client_id: item.client_id,
        reason: "IDEMPOTENT_MISMATCH",
        message: "同一同步标识收到不同内容，疑似两标签页写入冲突",
        remote_payload: findRemotePayload(state, item.client_id)
      });
      continue;
    }

    // 课程版本校验：会话/记录引用的课程指纹若落后于远端课程 → 失效
    const lessonHash = (item.payload as { lesson_version?: string }).lesson_version;
    const lessonId = (item.payload as { lesson_id?: number }).lesson_id;
    if (lessonHash && lessonId != null) {
      const remoteLesson = state.lessons.find((l) => l.id === lessonId);
      if (remoteLesson?.content_hash && remoteLesson.content_hash !== lessonHash) {
        conflicts.push({
          client_id: item.client_id,
          reason: "LESSON_VERSION_STALE",
          message: "课程内容已更新，旧练习成绩已失效",
          remote_payload: remoteLesson
        });
        continue;
      }
    }

    // 接收：按实体类型并入对应集合（答题记录取并集，会话按 client_id 唯一）
    const normalized = { ...item.payload, sync_status: SYNC_STATUS.SYNCED as SyncStatus };
    if (item.entity_type === "Lesson") {
      upsertByClientId(state.lessons as unknown as Array<Record<string, unknown>>, normalized);
    } else if (item.entity_type === "PracticeSession") {
      upsertByClientId(state.sessions as unknown as Array<Record<string, unknown>>, normalized);
    } else if (item.entity_type === "AnswerRecord") {
      upsertByClientId(state.answerRecords as unknown as Array<Record<string, unknown>>, normalized);
    }
    state.seen[item.client_id] = {
      entity_type: item.entity_type,
      updated_at: (normalized as { updated_at?: string }).updated_at ?? new Date().toISOString(),
      fingerprint: fp
    };
    accepted.push(item.client_id);
  }

  saveRemote(state);
  return { accepted, conflicts };
}

function upsertByClientId<T extends { client_id?: string }>(collection: T[], value: T): void {
  const idx = collection.findIndex((r) => r.client_id === value.client_id);
  if (idx >= 0) collection[idx] = value;
  else collection.push(value);
}

function findRemotePayload(state: RemoteState, clientId: string): unknown {
  return (
    state.sessions.find((s) => s.client_id === clientId) ??
    state.answerRecords.find((r) => r.client_id === clientId) ??
    state.lessons.find((l) => l.client_id === clientId) ??
    null
  );
}

/** 拉取远端全量状态（同步完成后下拉合并到本地） */
export function pullRemote(): RemoteState {
  return loadRemote();
}

/** 重置远端（调试/演示用） */
export function resetRemote(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(REMOTE_KEY);
}
