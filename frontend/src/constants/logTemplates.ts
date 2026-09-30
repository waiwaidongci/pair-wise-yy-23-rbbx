export const LOG_TEMPLATES = {
  BrailleSymbol: ["点字字符创建", "点字字符更新", "点字字符状态变更", "点字字符导出"],
  Lesson: ["课程创建", "课程更新", "课程状态变更", "课程导出", "课程内容指纹重算"],
  PracticeSession: ["练习会话创建", "练习会话更新", "练习会话状态变更", "练习会话导出", "会话版本标记失效"],
  AnswerRecord: ["答题记录创建", "答题记录更新", "答题记录状态变更", "答题记录导出"],
  // —— 离线同步链路日志 ——
  Sync: [
    "同步入队",
    "同步开始",
    "同步成功",
    "同步冲突",
    "同步失败",
    "断点续传",
    "网络恢复触发同步",
    "离线写入暂存队列"
  ],
  Migration: ["迁移开始", "迁移完成", "历史数据回填同步标识", "课程版本重算完成"]
} as const;

export type LogEntity = keyof typeof LOG_TEMPLATES;
export type LogTemplate = (typeof LOG_TEMPLATES)[LogEntity][number];
