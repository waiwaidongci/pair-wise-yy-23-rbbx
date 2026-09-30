import { useEffect, useState } from "react";
import { isForceOffline, setForceOffline } from "../utils/network";

/**
 * 在线状态。
 * 真实在线 = navigator.onLine 且未被"强制离线"开关覆盖。
 * 断网课堂场景下，用户可手动强制离线来模拟网络恢复前的状态。
 */
export function useOnlineStatus() {
  const browserOnline = useBrowserOnline();
  const [forcedOffline, setForcedOfflineState] = useState<boolean>(() => isForceOffline());

  useEffect(() => {
    setForceOffline(forcedOffline);
  }, [forcedOffline]);

  const online = browserOnline && !forcedOffline;

  return { online, browserOnline, forcedOffline, setForcedOffline: setForcedOfflineState };
}

function useBrowserOnline(): boolean {
  const [online, setOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}
