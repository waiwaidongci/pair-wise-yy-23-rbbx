export const SYNC_CONFIG = {
  dbName: "braille-trainer-db",
  dbVersion: 1,
  serverStorageKey: "braille-trainer:mock-server",
  metaKeys: {
    migrated: "legacyMigration:v1",
    lastFlushAt: "sync:lastFlushAt",
    flushSeq: "sync:flushSeq"
  },
  failureModeStorageKey: "braille-trainer:failure-mode",
  /** flush 时单项最多重试次数，超过后保留在队列中等待手动/下次续传 */
  maxAttempts: 5,
  flushDelayMs: 400
};
