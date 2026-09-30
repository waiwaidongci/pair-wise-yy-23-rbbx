/**
 * 后台同步 Worker。
 *
 * 职责：维护重试/退避计时器，定时向主线程发送 SYNC_TICK。
 * 实际同步逻辑（IndexedDB / 远端访问）在主线程完成，Worker 只负责计时，
 * 避免在 Worker 里重复初始化数据层。
 *
 * 退避策略：基础间隔 5s，失败后指数退避（上限 60s），
 * 网络恢复时主线程会立即触发一次同步，不必等计时器。
 */

const BASE_INTERVAL = 5_000;
const MAX_INTERVAL = 60_000;

let timer: ReturnType<typeof setTimeout> | null = null;
let failures = 0;

function schedule() {
  if (timer) clearTimeout(timer);
  const delay = Math.min(BASE_INTERVAL * 2 ** failures, MAX_INTERVAL);
  timer = setTimeout(() => {
    self.postMessage({ type: "SYNC_TICK", backoff: delay });
    schedule();
  }, delay);
}

self.onmessage = (event: MessageEvent) => {
  const msg = event.data as { type?: string; ok?: boolean };
  if (msg.type === "START") {
    failures = 0;
    schedule();
  } else if (msg.type === "STOP") {
    if (timer) clearTimeout(timer);
    timer = null;
  } else if (msg.type === "SYNC_RESULT") {
    // 主线程同步成功 → 重置退避；失败 → 递增退避
    failures = msg.ok ? 0 : Math.min(failures + 1, 4);
  }
};

export {};
