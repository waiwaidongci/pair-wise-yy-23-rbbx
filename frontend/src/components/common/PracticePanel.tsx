import type { ReactNode } from "react";

export function PracticePanel({
  title = "PracticePanel",
  value,
  children
}: {
  title?: string;
  value?: string;
  children?: ReactNode;
}) {
  return (
    <div className="panel practice-panel">
      <h2>{title}</h2>
      {children ?? <span className="badge">{value ?? "READY"}</span>}
    </div>
  );
}
