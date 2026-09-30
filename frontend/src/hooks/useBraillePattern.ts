import { useMemo } from "react";
import type { BrailleSymbol } from "../types/BrailleSymbol";

/**
 * 点字点阵。
 * 输入 cell_pattern（如 "1,2,3" 或 "⠁"）输出六点点阵 [dot1..dot6]。
 * 盲文点位编号：左上 1、左中 2、左下 3、右上 4、右中 5、右下 6。
 */
export function useBraillePattern(symbol: BrailleSymbol | undefined) {
  return useMemo(() => {
    if (!symbol) return { dots: [false, false, false, false, false, false], label: "" };
    const dots = parseDots(symbol.cell_pattern);
    return { dots, label: symbol.letter };
  }, [symbol]);
}

/** 把 cell_pattern 解析成六点布尔数组 */
function parseDots(pattern: string): boolean[] {
  const dots = [false, false, false, false, false, false];
  if (!pattern) return dots;

  // 形式一：逗号/空格分隔的点位编号，如 "1,2,3"
  const nums = pattern
    .split(/[,\s]+/)
    .map((s) => parseInt(s, 10))
    .filter((n) => n >= 1 && n <= 6);
  if (nums.length) {
    nums.forEach((n) => {
      dots[n - 1] = true;
    });
    return dots;
  }

  // 形式二：Unicode 盲文字符（U+2800..U+28FF），按位映射
  const code = pattern.codePointAt(0);
  if (code && code >= 0x2800 && code <= 0x28ff) {
    const mask = code - 0x2800;
    for (let i = 0; i < 6; i++) {
      dots[i] = (mask & (1 << i)) !== 0;
    }
  }
  return dots;
}

/** 六点点阵 → 盲文 Unicode 字符（供展示） */
export function dotsToChar(dots: boolean[]): string {
  let mask = 0;
  dots.forEach((on, i) => {
    if (on) mask |= 1 << i;
  });
  return String.fromCodePoint(0x2800 + mask);
}
