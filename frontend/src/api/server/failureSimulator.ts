import { SYNC_CONFIG } from "../../constants/syncConfig";
import type { FailureMode } from "../../types/FailureMode";

/**
 * 写入失败注入：用于演示“写入失败后保留队列并断点续传”。
 * FAIL_NEXT 表示下一次服务端写入抛 500，消费一次后自动复位为 NONE。
 */
export function getFailureMode(): FailureMode {
  try {
    return (localStorage.getItem(SYNC_CONFIG.failureModeStorageKey) as FailureMode) || "NONE";
  } catch {
    return "NONE";
  }
}

export function setFailureMode(mode: FailureMode) {
  try {
    if (mode === "NONE") localStorage.removeItem(SYNC_CONFIG.failureModeStorageKey);
    else localStorage.setItem(SYNC_CONFIG.failureModeStorageKey, mode);
  } catch {
    // 隐私模式下 localStorage 不可用时忽略注入
  }
}

export function consumeFailNext(): boolean {
  if (getFailureMode() !== "FAIL_NEXT") return false;
  setFailureMode("NONE");
  return true;
}
