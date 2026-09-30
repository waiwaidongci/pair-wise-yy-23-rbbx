import type { Lesson } from "../types/Lesson";

/**
 * 课程内容指纹（content_hash）。
 * 课程内容变化后，已有会话/进度要据此重算、旧结果失效。
 * 指纹只依赖会影响练习内容的字段（symbol_ids 集合 + 标题），
 * 与顺序无关（symbol_ids 排序后再哈希），避免无意义的顺序抖动。
 */
export function computeContentHash(lesson: Pick<Lesson, "title" | "symbol_ids">): string {
  const ids = [...(lesson.symbol_ids ?? [])].sort((a, b) => a - b).join(".");
  const basis = `${lesson.title ?? ""}|${ids}`;
  return fnv1a(basis);
}

/** FNV-1a 32 位哈希，稳定、碰撞概率低，适合做内容指纹 */
function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // 转成无符号 32 位十六进制
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** 判断会话/记录的课程版本是否已落后于当前课程内容 */
export function isLessonVersionStale(
  lessonVersion: string | undefined,
  currentHash: string | undefined
): boolean {
  if (!lessonVersion || !currentHash) return false; // 缺版本信息时不臆断为失效
  return lessonVersion !== currentHash;
}
