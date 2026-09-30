import type { ReactNode } from "react";

/**
 * 练习面板：承载题干与作答区的容器组件。
 */
export function PracticePanel({
  title,
  children,
  footer
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="panel practice-panel">
      <h2>{title}</h2>
      <div className="practice-body">{children}</div>
      {footer && <div className="practice-footer">{footer}</div>}
    </div>
  );
}
