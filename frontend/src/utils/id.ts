/**
 * 全局幂等键（client_id）生成。
 * 离线场景下两个标签页各自产生记录，本地自增 id 会撞车，
 * 必须用客户端生成的 uuid 作为跨端身份，远端据此去重（重复同步只收一次）。
 */
export function createClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // 兜底：时间戳 + 随机串，保证离线也能生成
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** 判断某条记录是否已有同步身份（历史数据可能缺失） */
export function hasClientId(value: { client_id?: string } | null | undefined): value is { client_id: string } {
  return !!value && typeof value.client_id === "string" && value.client_id.length > 0;
}
