import { useMemo } from "react";

/** 小写字母到盲文点位的简单映射，供学习卡片和练习判题使用 */
const LETTER_PATTERNS: Record<string, string> = {
  a: "1",
  b: "1,2",
  c: "1,4",
  d: "1,4,5",
  e: "1,5",
  f: "1,2,4",
  g: "1,2,4,5",
  h: "1,2,5",
  i: "2,4",
  j: "2,4,5"
};

export function useBraillePattern(letter?: string) {
  const pattern = useMemo(() => {
    if (!letter) return "";
    return LETTER_PATTERNS[letter.toLowerCase()] ?? "";
  }, [letter]);

  return { pattern, isKnown: Boolean(pattern) };
}

/** 判断用户输入的点位串（忽略顺序与空格）是否与目标一致 */
export function isSamePattern(input: string, target: string): boolean {
  const normalize = (value: string) =>
    value
      .split(/[,\s]+/)
      .filter(Boolean)
      .map((item) => Number(item))
      .filter((item) => item >= 1 && item <= 6)
      .sort((a, b) => a - b)
      .join(",");
  return normalize(input) === normalize(target);
}
