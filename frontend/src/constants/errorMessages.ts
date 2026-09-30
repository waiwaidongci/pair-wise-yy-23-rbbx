import { ERROR_CODES } from "./errorCodes";

export const ERROR_MESSAGES: Record<string, string> = {
  [ERROR_CODES.AUTH_REQUIRED]: "请先登录后再继续操作",
  [ERROR_CODES.RBAC_DENIED]: "当前角色没有执行该动作的权限",
  [ERROR_CODES.VALIDATION_FAILED]: "表单字段缺失或格式错误",
  [ERROR_CODES.RATE_LIMITED]: "请求过于频繁，请稍后再试",
  // —— 离线同步链路错误消息 ——
  [ERROR_CODES.SYNC_OFFLINE]: "当前处于离线状态，写入已暂存到待同步队列，联网后自动合并",
  [ERROR_CODES.SYNC_CONFLICT]: "同步时发现冲突，请在同步中心处理后再练习",
  [ERROR_CODES.SYNC_FAILED]: "同步失败，已保留队列，将断点续传",
  [ERROR_CODES.SYNC_QUEUE_FULL]: "待同步队列已满，请先在同步中心处理",
  [ERROR_CODES.SYNC_IDEMPOTENT_MISMATCH]: "同一同步标识收到不同内容，疑似重复写入冲突",
  [ERROR_CODES.LESSON_VERSION_STALE]: "课程内容已更新，旧练习成绩已失效，请重新练习",
  [ERROR_CODES.MIGRATION_FAILED]: "历史数据迁移失败，请刷新页面重试",
  [ERROR_CODES.OUTBOX_WRITE_FAILED]: "写入待同步队列失败，请重试"
};

/** 按错误码取消息，缺省回退到通用提示 */
export function errorMessageOf(code: string): string {
  return ERROR_MESSAGES[code] ?? "操作失败，请稍后重试";
}
