/**
 * 网络状态工具。
 *
 * "强制离线"是演示开关：打开后即使浏览器在线也不推送同步，
 * 模拟断网课堂（断网继续作答，联网后自动合并）。
 */
const FORCE_OFFLINE_KEY = "braille-trainer:force-offline";

export function isForceOffline(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(FORCE_OFFLINE_KEY) === "1";
}

export function setForceOffline(value: boolean): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(FORCE_OFFLINE_KEY, value ? "1" : "0");
}

/** 真正可推送同步 = 浏览器在线 且 未强制离线 */
export function isEffectiveOnline(): boolean {
  if (typeof navigator === "undefined") return !isForceOffline();
  return navigator.onLine && !isForceOffline();
}
