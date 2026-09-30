export const formatDate = (value: string) => (value ? new Date(value).toLocaleString("zh-CN") : "—");
export const formatStatus = (value: string) => value.replace(/_/g, " ");
export const formatNumber = (value: number) => new Intl.NumberFormat("zh-CN").format(value);
export const formatRisk = (value: string) => ({ LOW: "低", MEDIUM: "中", HIGH: "高", CRITICAL: "严重", EXTREME: "极高" }[value] ?? value);
export const formatLatency = (value: number) => `${(value / 1000).toFixed(1)} 秒`;
export const formatPercent = (value: number) => `${value}%`;

/** 失败原因/错误码统一从这里映射成中文，多个页面共同依赖 */
export const formatFailureReason = (code: string, fallback?: string): string => {
  const mapped: Record<string, string> = {
    NETWORK_OFFLINE: "断网中，已加入待同步队列",
    SYNC_WRITE_FAILED: fallback ?? "写入失败，队列已保留，可断点续传",
    VERSION_CONFLICT: "课程版本冲突，需要选择保留本地或采用远端",
    RECORD_MERGE_CONFLICT: "同一题目作答不一致，需要选择保留哪一份",
    RATE_LIMITED: "请求过于频繁，请稍后再试",
    VALIDATION_FAILED: "数据格式校验失败"
  };
  return mapped[code] ?? fallback ?? code;
};
