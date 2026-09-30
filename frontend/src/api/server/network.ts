/** 模拟断网环境：除 navigator.onLine 外，课堂演示页可手动切换离线 */
const manualOfflineListeners = new Set<(offline: boolean) => void>();
let manualOffline = false;

export function setManualOffline(offline: boolean) {
  if (manualOffline === offline) return;
  manualOffline = offline;
  manualOfflineListeners.forEach((listener) => listener(offline));
}

export function isManualOffline(): boolean {
  return manualOffline;
}

export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine && !manualOffline : !manualOffline;
}

export function subscribeOnlineChange(listener: (online: boolean) => void): () => void {
  const browserListener = () => listener(isOnline());
  const manualListener = () => listener(isOnline());
  window.addEventListener("online", browserListener);
  window.addEventListener("offline", browserListener);
  manualOfflineListeners.add(manualListener);
  return () => {
    window.removeEventListener("online", browserListener);
    window.removeEventListener("offline", browserListener);
    manualOfflineListeners.delete(manualListener);
  };
}
