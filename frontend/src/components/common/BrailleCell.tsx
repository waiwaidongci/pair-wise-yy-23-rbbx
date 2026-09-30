import { useBraillePattern } from "../../hooks/useBraillePattern";
import type { BrailleSymbol } from "../../types/BrailleSymbol";

/**
 * 点字点阵单元格。
 * 根据 cell_pattern 渲染 2×3 六点矩阵（盲文点位：1 4 / 2 5 / 3 6）。
 */
export function BrailleCell({
  symbol,
  size = "md",
  showLabel = false
}: {
  symbol?: BrailleSymbol;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}) {
  const { dots } = useBraillePattern(symbol);
  // 视觉布局：左列 1,2,3 右列 4,5,6
  const layout = [0, 3, 1, 4, 2, 5];

  return (
    <div className={`braille-cell size-${size}`} aria-label={symbol ? `点字 ${symbol.letter}` : "点字"}>
      <div className="braille-dots">
        {layout.map((dotIndex) => (
          <span key={dotIndex} className={`braille-dot ${dots[dotIndex] ? "on" : ""}`} />
        ))}
      </div>
      {showLabel && symbol && <span className="braille-label">{symbol.letter}</span>}
    </div>
  );
}
