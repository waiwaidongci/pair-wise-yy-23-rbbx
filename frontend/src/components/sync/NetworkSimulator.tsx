import { useState } from "react";
import { setManualOffline, isManualOffline } from "../../api/server/network";
import { getFailureMode, setFailureMode } from "../../api/server/failureSimulator";
import { useSyncStore } from "../../stores/SyncStore";
import type { FailureMode } from "../../types/FailureMode";

/**
 * 课堂演示/自测用控制台：
 * 手动断网验证“断网继续作答、回网按答题记录合并”；
 * 注入一次写入失败验证“失败保留队列、断点续传”。
 */
export function NetworkSimulator() {
  const flush = useSyncStore((state) => state.flush);
  const [offline, setOffline] = useState(isManualOffline());
  const [failureMode, setMode] = useState<FailureMode>(getFailureMode());

  const toggleOffline = () => {
    const next = !offline;
    setManualOffline(next);
    setOffline(next);
    if (!next) setTimeout(() => void flush(), 100);
  };

  const triggerFailNext = () => {
    setFailureMode("FAIL_NEXT");
    setMode("FAIL_NEXT");
    void flush().then(() => setMode(getFailureMode()));
  };

  return (
    <div className="panel network-simulator">
      <h2>离线训练演练台</h2>
      <p className="hint">可在两个标签页同时练习同一课程，观察回网后按答题记录合并、重复同步只收一次。</p>
      <div className="sim-actions">
        <button className={"sim-button " + (offline ? "active-danger" : "")} onClick={toggleOffline}>
          {offline ? "恢复网络（触发合并同步）" : "模拟断网"}
        </button>
        <button className="sim-button" onClick={triggerFailNext} disabled={failureMode === "FAIL_NEXT"}>
          注入一次写入失败（500）
        </button>
      </div>
      <p className="hint">失败后队列项保留并显示原因；网络恢复或再次点击“立即同步”即从断点继续。</p>
    </div>
  );
}
