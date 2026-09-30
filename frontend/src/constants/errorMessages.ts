export const ERROR_MESSAGES = {
  AUTH_REQUIRED: "请先登录后再继续操作",
  RBAC_DENIED: "当前角色没有执行该动作的权限",
  VALIDATION_FAILED: "表单字段缺失或格式错误",
  RATE_LIMITED: "请求过于频繁，请稍后再试",
  NETWORK_OFFLINE: "网络已断开，操作已加入待同步队列",
  SYNC_WRITE_FAILED: "写入失败，已保留队列，恢复网络后将断点续传",
  VERSION_CONFLICT: "课程版本已变化（可能在其他标签页修改），请处理冲突后再练习",
  LESSON_CONTENT_CHANGED: "课程内容已更新，旧练习会话与进度已重算，历史结果标记失效",
  RECORD_MERGE_CONFLICT: "同一道题存在不同作答，已生成冲突记录待处理",
  MIGRATION_REQUIRED: "历史数据缺少同步标识，已先完成兼容迁移再同步"
} as const;
