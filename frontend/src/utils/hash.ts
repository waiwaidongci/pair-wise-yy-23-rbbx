/** 课程内容指纹：标题、关卡、字符集合等变化后 hash 改变，旧会话据此失效重算 */
export function hashLessonContent(input: {
  title: string;
  symbol_ids: number[];
  stage: string;
  estimated_minutes: number;
  unlock_rule: string;
}): string {
  const normalized = JSON.stringify({
    title: input.title,
    symbol_ids: [...input.symbol_ids].sort((a, b) => a - b),
    stage: input.stage,
    estimated_minutes: input.estimated_minutes,
    unlock_rule: input.unlock_rule
  });
  let hash = 5381;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 33) ^ normalized.charCodeAt(i);
  }
  return `h${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
