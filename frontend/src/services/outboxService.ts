/**
 * outbox 队列服务。
 *
 * 所有离线写入先入队（IndexedDB outbox 表），网络恢复后按序同步。
 * 队列持久化，刷新/断网都不丢；检查点记录已处理位置，实现断点续传。
 */
import { STORES, getAll, put, remove, getMeta, setMeta } from "../db";
import {
  SYNC_STATUS,
  type OutboxItem,
  type SyncCheckpoint,
  type SyncStatus,
  type ConflictReason
} from "../types/sync";
import { createCheckpoint, createOutboxItem } from "../constructors/SyncConstructor";
import type { EntityType } from "../types/sync";

const CHECKPOINT_KEY = "sync-checkpoint";

export async function listOutbox(): Promise<OutboxItem[]> {
  const rows = await getAll<OutboxItem>(STORES.OUTBOX);
  return rows.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
}

export async function enqueue(input: {
  entity_type: EntityType;
  payload: OutboxItem["payload"];
  client_id?: string;
}): Promise<OutboxItem> {
  const item = createOutboxItem(input);
  const id = await put(STORES.OUTBOX, item);
  return { ...item, id: Number(id) };
}

export async function updateItem(id: number, patch: Partial<OutboxItem>): Promise<void> {
  const rows = await getAll<OutboxItem>(STORES.OUTBOX);
  const current = rows.find((r) => r.id === id);
  if (!current) return;
  await put(STORES.OUTBOX, { ...current, ...patch, updated_at: new Date().toISOString() });
}

export async function removeItem(id: number): Promise<void> {
  await remove(STORES.OUTBOX, id);
}

export async function getCheckpoint(): Promise<SyncCheckpoint> {
  const cp = await getMeta<SyncCheckpoint>(CHECKPOINT_KEY);
  return cp ?? createCheckpoint(0);
}

export async function setCheckpoint(lastId: number): Promise<void> {
  await setMeta(CHECKPOINT_KEY, createCheckpoint(lastId));
}

/** 重置检查点（冲突全部处理完后，让队列从头扫一遍） */
export async function resetCheckpoint(): Promise<void> {
  await setMeta(CHECKPOINT_KEY, createCheckpoint(0));
}

export interface OutboxCounts {
  pending: number;
  synced: number;
  conflict: number;
  failed: number;
  total: number;
}

export function countByStatus(items: OutboxItem[]): OutboxCounts {
  const counts: OutboxCounts = { pending: 0, synced: 0, conflict: 0, failed: 0, total: items.length };
  for (const it of items) {
    if (it.status === SYNC_STATUS.PENDING) counts.pending += 1;
    else if (it.status === SYNC_STATUS.SYNCED) counts.synced += 1;
    else if (it.status === SYNC_STATUS.CONFLICT) counts.conflict += 1;
    else if (it.status === SYNC_STATUS.FAILED) counts.failed += 1;
  }
  return counts;
}

export function conflictsOf(items: OutboxItem[]): OutboxItem[] {
  return items.filter((it) => it.status === SYNC_STATUS.CONFLICT);
}

export function failedOf(items: OutboxItem[]): OutboxItem[] {
  return items.filter((it) => it.status === SYNC_STATUS.FAILED);
}

export function pendingOf(items: OutboxItem[]): OutboxItem[] {
  return items.filter((it) => it.status === SYNC_STATUS.PENDING);
}

/** 把某条记录相关的 outbox 项标记为指定状态（冲突解决时用） */
export async function markByClientId(clientId: string, status: SyncStatus, extra?: Partial<OutboxItem>): Promise<void> {
  const items = await listOutbox();
  for (const it of items) {
    if (it.client_id === clientId) {
      await updateItem(it.id!, { status, ...extra });
    }
  }
}

export async function markConflict(clientId: string, reason: ConflictReason, message: string): Promise<void> {
  await markByClientId(clientId, SYNC_STATUS.CONFLICT, { conflict_reason: reason, last_error: message });
}

export async function markFailed(clientId: string, error: string): Promise<void> {
  await markByClientId(clientId, SYNC_STATUS.FAILED, { last_error: error });
}
