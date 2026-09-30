/** 六点盲文单元格：pattern 为点亮的点位，如 "1,2,4" */
export function BrailleCell({ pattern, size = 64, title }: { pattern?: string; size?: number; title?: string }) {
  if (!pattern) {
    return (
      <div className="shared-widget braille-fallback">
        {title ? <strong>{title}</strong> : null}
        <span className="braille-empty">无点阵数据</span>
      </div>
    );
  }
  const dots = new Set(
    pattern
      .split(",")
      .map((item) => Number(item.trim()))
      .filter(Boolean)
  );
  return (
    <div className="braille-cell" role="img" aria-label={`盲文点阵 ${pattern}`} style={{ width: size, height: size }}>
      {Array.from({ length: 6 }, (_, index) => {
        // 点位排列：左列 1,2,3；右列 4,5,6
        const dotNumber = index % 2 === 0 ? index / 2 + 1 : (index - 1) / 2 + 4;
        return <span key={dotNumber} className={"braille-dot" + (dots.has(dotNumber) ? " on" : "")} />;
      })}
    </div>
  );
}
