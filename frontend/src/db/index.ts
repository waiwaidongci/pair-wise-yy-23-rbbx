/**
 * 本地 IndexedDB 封装。
 *
 * 物理分层：
 * - 本地（IndexedDB）：lessons / sessions / answer_records / outbox / meta
 *   断网时所有读写都落本地，outbox 队列保证不丢。
 * - 远端（localStorage 模拟，见 services/remoteStore）：按 client_id 合并的权威副本。
 */

const DB_NAME = "braille-trainer-db";
const DB_VERSION = 1;

export const STORES = {
  LESSONS: "lessons",
  SESSIONS: "sessions",
  ANSWER_RECORDS: "answer_records",
  OUTBOX: "outbox",
  META: "meta"
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("当前环境不支持 IndexedDB"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.LESSONS)) {
        db.createObjectStore(STORES.LESSONS, { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
        const s = db.createObjectStore(STORES.SESSIONS, { keyPath: "id", autoIncrement: true });
        s.createIndex("client_id", "client_id", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.ANSWER_RECORDS)) {
        const s = db.createObjectStore(STORES.ANSWER_RECORDS, { keyPath: "id", autoIncrement: true });
        s.createIndex("client_id", "client_id", { unique: false });
        s.createIndex("session_id", "session_id", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.OUTBOX)) {
        const o = db.createObjectStore(STORES.OUTBOX, { keyPath: "id", autoIncrement: true });
        o.createIndex("client_id", "client_id", { unique: false });
        o.createIndex("status", "status", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.META)) {
        db.createObjectStore(STORES.META, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

export async function getAll<T>(store: string): Promise<T[]> {
  return tx<T[]>(store, "readonly", (s) => s.getAll() as IDBRequest<T[]>);
}

export async function get<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
  return tx<T | undefined>(store, "readonly", (s) => s.get(key) as IDBRequest<T | undefined>);
}

export async function put<T>(store: string, value: T): Promise<IDBValidKey> {
  return tx<IDBValidKey>(store, "readwrite", (s) => s.put(value) as IDBRequest<IDBValidKey>);
}

export async function putMany<T>(store: string, values: T[]): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(store, "readwrite");
    const s = t.objectStore(store);
    values.forEach((v) => s.put(v));
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function remove(store: string, key: IDBValidKey): Promise<void> {
  await tx<undefined>(store, "readwrite", (s) => s.delete(key) as IDBRequest<undefined>);
}

export async function clearStore(store: string): Promise<void> {
  await tx<undefined>(store, "readwrite", (s) => s.clear() as IDBRequest<undefined>);
}

/** meta 键值读写（迁移状态、检查点等） */
export async function getMeta<T>(key: string): Promise<T | undefined> {
  const row = await get<{ key: string; value: T }>(STORES.META, key);
  return row?.value;
}

export async function setMeta<T>(key: string, value: T): Promise<void> {
  await put(STORES.META, { key, value });
}

/** 清空全部本地数据（调试/重置用） */
export async function clearAll(): Promise<void> {
  const db = await openDB();
  await Promise.all(
    [STORES.LESSONS, STORES.SESSIONS, STORES.ANSWER_RECORDS, STORES.OUTBOX, STORES.META].map(
      (s) =>
        new Promise<void>((resolve, reject) => {
          const t = db.transaction(s, "readwrite");
          t.objectStore(s).clear();
          t.oncomplete = () => resolve();
          t.onerror = () => reject(t.error);
        })
    )
  );
}
