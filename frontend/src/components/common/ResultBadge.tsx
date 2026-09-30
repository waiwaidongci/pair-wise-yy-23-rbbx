export function ResultBadge({ correct, value }: { correct?: boolean; value?: string }) {
  if (typeof correct === "boolean") {
    return <span className={"badge " + (correct ? "synced" : "conflict")}>{correct ? "回答正确" : "回答错误"}</span>;
  }
  return <span className="badge">{value ?? "READY"}</span>;
}
