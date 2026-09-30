import { SYNC_CONFIG } from "../constants/syncConfig";
import type { BrailleSymbol } from "../types/BrailleSymbol";
import type { Lesson } from "../types/Lesson";
import type { PracticeSession } from "../types/PracticeSession";
import type { AnswerRecord } from "../types/AnswerRecord";
import type { SyncOutboxItem } from "../types/SyncOutboxItem";
import type { SyncConflict } from "../types/SyncConflict";
import type { SyncMeta } from "../types/SyncMeta";
import { logError } from "../utils/logger";

export const STORES = {
  brailleSymbol: "brailleSymbol",
  lesson: "lesson",
  practiceSession: "practiceSession",
  answerRecord: "answerRecord",
  outbox: "outbox",
  conflicts: "conflicts",
  meta: "meta"
} as const;

export type StoreName = keyof typeof STORES;

export interface LocalDatabase {
  brailleSymbol: BrailleSymbol;
  lesson: Lesson;
  practiceSession: PracticeSession;
  answerRecord: AnswerRecord;
  outbox: SyncOutboxItem;
  conflicts: SyncConflict;
  meta: SyncMeta;
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(SYNC_CONFIG.dbName, SYNC_CONFIG.dbVersion);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORES.brailleSymbol)) db.createObjectStore(STORES.brailleSymbol, { keyPath: "id" });
      if (!db.objectStoreNames.contains(STORES.lesson)) db.createObjectStore(STORES.lesson, { keyPath: "id" });
      if (!db.objectStoreNames.contains(STORES.practiceSession)) db.createObjectStore(STORES.practiceSession, { keyPath: "id" });
      if (!db.objectStoreNames.contains(STORES.answerRecord)) db.createObjectStore(STORES.answerRecord, { keyPath: "id" });
      if (!db.objectStoreNames.contains(STORES.outbox)) {
        const outbox = db.createObjectStore(STORES.outbox, { keyPath: "op_id" });
        outbox.createIndex("seq", "seq", { unique: true });
        outbox.createIndex("state", "state", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.conflicts)) db.createObjectStore(STORES.conflicts, { keyPath: "id" });
      if (!db.objectStoreNames.contains(STORES.meta)) db.createObjectStore(STORES.meta, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function tx<T>(store: StoreName, mode: IDBTransactionMode, run: (objectStore: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(store, mode);
        const request = run(transaction.objectStore(STORES[store]));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      })
  );
}

export async function idbGetAll<S extends StoreName>(store: S): Promise<LocalDatabase[S][]> {
  return tx(store, "readonly", (s) => s.getAll() as IDBRequest<LocalDatabase[S][]>);
}

export async function idbGet<S extends StoreName>(store: S, key: IDBValidKey): Promise<LocalDatabase[S] | undefined> {
  return tx(store, "readonly", (s) => s.get(key) as IDBRequest<LocalDatabase[S] | undefined>);
}

export async function idbPut<S extends StoreName>(store: S, value: LocalDatabase[S]): Promise<IDBValidKey> {
  return tx(store, "readwrite", (s) => s.put(value));
}

export async function idbPutMany<S extends StoreName>(store: S, values: LocalDatabase[S][]): Promise<void> {
  if (values.length === 0) return;
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(store, "readwrite");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    const objectStore = transaction.objectStore(STORES[store]);
    values.forEach((value) => objectStore.put(value));
  });
}

export async function idbDelete<S extends StoreName>(store: S, key: IDBValidKey): Promise<void> {
  await tx(store, "readwrite", (s) => s.delete(key));
}

/** 同一事务内写入实体并登记 outbox，避免“数据写了队列丢了”或反之 */
export async function idbPutEntityWithOutbox<S extends Exclude<StoreName, "outbox" | "conflicts" | "meta">>(
  store: S,
  entity: LocalDatabase[S],
  outboxItem: SyncOutboxItem
): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([STORES[store], STORES.outbox], "readwrite");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => {
      logError("SYNC_WRITE_FAILED", `本地事务写入失败: ${store}`, { key: outboxItem.op_id });
      reject(transaction.error);
    };
    transaction.objectStore(STORES[store]).put(entity);
    transaction.objectStore(STORES.outbox).put(outboxItem);
  });
}

export async function idbClear(store: StoreName): Promise<void> {
  await tx(store, "readwrite", (s) => s.clear());
}
