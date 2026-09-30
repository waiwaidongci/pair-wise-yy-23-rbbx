/** 生成跨标签页全局唯一标识（session_uid / record_uid / op_id 都用它） */
export function createUid(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${rand}`;
}
