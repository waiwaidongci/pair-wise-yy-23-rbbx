import { SyncStateText } from "../../constants/SyncStateText";

export function StatusBadge({ value, label }: { value: string; label?: string }) {
  const text = label ?? SyncStateText[value as keyof typeof SyncStateText] ?? String(value).replace(/_/g, " ");
  return <span className={"badge " + String(value).toLowerCase().replace(/_/g, "-")}>{text}</span>;
}
