/** 纯 CSS 柱状图，避免离线时第三方图表库不可用 */
export function ChartPanel({
  title,
  data
}: {
  title: string;
  data: Array<{ label: string; value: number; tone?: string }>;
}) {
  const max = Math.max(1, ...data.map((item) => item.value));
  return (
    <div className="panel chart-panel">
      <h2>{title}</h2>
      <div className="chart-bars">
        {data.map((item) => (
          <div className="chart-col" key={item.label}>
            <div className="chart-bar-track">
              <div
                className={"chart-bar " + (item.tone ?? "")}
                style={{ height: `${(item.value / max) * 100}%` }}
                title={`${item.label}: ${item.value}`}
              />
            </div>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
