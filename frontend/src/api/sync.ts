/**
 * 同步 API：本地 → 远端 的边界。
 *
 * 纯前端项目用 localStorage 模拟远端服务器（见 services/remoteStore）。
 * 这里额外模拟了网络延迟与可注入的写入失败，用来演示：
 * - 写入失败后保留队列、断点续传；
 * - 重复同步只收一次（幂等）。
 */
import { pushRemote, pullRemote, type RemoteState } from "../services/remoteStore";
import type { OutboxItem } from "../types/sync";

/** 失败注入开关（同步中心页面可打开，演示断点续传） */
let simulateFailure = false;
export function setSimulateFailure(value: boolean): void {
  simulateFailure = value;
}
export function isSimulateFailure(): boolean {
  return simulateFailure;
}

/** 模拟网络延迟 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface SyncApiResult {
  accepted: string[];
  conflicts: Array<{ client_id: string; reason: string; message: string; remote_payload: unknown }>;
  server: RemoteState;
}

/**
 * 把一批 outbox 项推送到远端。
 * 失败时抛错——调用方负责保留队列并从断点续传，而不是丢弃。
 */
export async function syncRemote(items: OutboxItem[]): Promise<SyncApiResult> {
  await delay(350 + Math.random() * 450);
  if (simulateFailure) {
    const err = new Error("模拟写入失败：服务端暂时不可用（队列已保留，可断点续传）");
    (err as Error & { code?: string }).code = "SYNC_FAILED";
    throw err;
  }
  const pushed = pushRemote(
    items.map((it) => ({
      client_id: it.client_id,
      entity_type: it.entity_type,
      payload: it.payload as Record<string, unknown>
    }))
  );
  const server = pullRemote();
  return { accepted: pushed.accepted, conflicts: pushed.conflicts, server };
}

/** 仅拉取远端状态（下拉合并用） */
export async function fetchRemoteState(): Promise<RemoteState> {
  await delay(120);
  return pullRemote();
}
