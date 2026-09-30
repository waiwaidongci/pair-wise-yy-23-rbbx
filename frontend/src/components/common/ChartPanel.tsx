/**
 * 图表面板：用纯 CSS 条形图展示分布/趋势，避免引入额外图表库的运行时负担。
 */
export function ChartPanel({
  title,
  data
}: {
  title: string;
  data: Array<{ label: string; value: number; tone?: string }>;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="panel chart-panel">
      <h2>{title}</h2>
      <div className="chart-bars">
        {data.length === 0 && <p className="muted">暂无数据</p>}
        {data.map((d) => (
          <div key={d.label} className="chart-row">
            <span className="chart-label">{d.label}</span>
            <div className="chart-track">
              <div
                className={`chart-fill tone-${d.tone ?? "info"}`}
                style={{ width: `${Math.round((d.value / max) * 100)}%` }}
              />
            </div>
            <span className="chart-value">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
