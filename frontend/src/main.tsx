import React, { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { routes } from "./router/routes";
import { useLessonStore } from "./stores/LessonStore";
import { usePracticeSessionStore } from "./stores/PracticeSessionStore";
import { useAnswerRecordStore } from "./stores/AnswerRecordStore";
import { useBrailleSymbolStore } from "./stores/BrailleSymbolStore";
import { useSyncStore } from "./stores/syncStore";
import { runMigration } from "./services/migrationService";
import { resumeWhenOnline } from "./services/syncService";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { SyncBanner } from "./components/common/SyncBanner";
import { LearnPage } from "./pages/LearnPage";
import { PracticePage } from "./pages/PracticePage";
import { MistakesPage } from "./pages/MistakesPage";
import { ProgressPage } from "./pages/ProgressPage";
import { SyncPage } from "./pages/SyncPage";
import syncWorker from "./workers/syncWorker?worker";
import "./styles.css";

function App() {
  const [active, setActive] = useState<string>(routes[0]?.route ?? "/learn");
  const [ready, setReady] = useState(false);

  const loadLessons = useLessonStore((s) => s.load);
  const loadSessions = usePracticeSessionStore((s) => s.load);
  const loadRecords = useAnswerRecordStore((s) => s.load);
  const loadSymbols = useBrailleSymbolStore((s) => s.load);
  const loadOutbox = useSyncStore((s) => s.loadOutbox);
  const sync = useSyncStore((s) => s.sync);
  const setOnline = useSyncStore((s) => s.setOnline);

  const { online } = useOnlineStatus();

  // 启动：迁移（幂等）→ 加载本地数据 → 加载队列
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await runMigration();
        await Promise.all([loadLessons(), loadSessions(), loadRecords(), loadSymbols()]);
        await loadOutbox();
      } catch (err) {
        console.error("启动迁移失败", err);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadLessons, loadSessions, loadRecords, loadSymbols, loadOutbox]);

  // 后台 worker：定时 SYNC_TICK（退避），在线且有待同步项时自动同步
  useEffect(() => {
    const worker = new syncWorker();
    worker.postMessage({ type: "START" });
    worker.onmessage = async (e: MessageEvent) => {
      if (e.data?.type === "SYNC_TICK" && navigator.onLine) {
        const outcome = await sync();
        worker.postMessage({ type: "SYNC_RESULT", ok: outcome.failed === 0 && outcome.conflicts.length === 0 });
      }
    };
    return () => {
      worker.postMessage({ type: "STOP" });
      worker.terminate();
    };
  }, [sync]);

  // 网络恢复：立即触发一次同步（断点续传）
  useEffect(() => {
    const onOnline = async () => {
      setOnline(true);
      await resumeWhenOnline(true);
      await loadOutbox();
      await Promise.all([loadSessions(), loadRecords()]);
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [setOnline, loadOutbox, loadSessions, loadRecords]);

  const navigate = useCallback((route: string) => {
    setActive(route);
  }, []);

  const current = routes.find((r) => r.route === active) ?? routes[0];

  return (
    <div className="shell">
      <aside>
        <div className="brand">盲文点字学习训练器</div>
        <nav>
          {routes.map((route) => (
            <button
              key={route.route}
              className={active === route.route ? "active" : ""}
              onClick={() => setActive(route.route)}
            >
              {route.name}
            </button>
          ))}
        </nav>
      </aside>
      <div className="main-col">
        <SyncBanner onNavigate={navigate} />
        {!ready ? (
          <main className="page">
            <p className="muted">正在加载本地数据…</p>
          </main>
        ) : (
          <>
            {current.route === "/learn" && <LearnPage />}
            {current.route === "/practice" && <PracticePage onNavigate={navigate} />}
            {current.route === "/mistakes" && <MistakesPage onNavigate={navigate} />}
            {current.route === "/progress" && <ProgressPage />}
            {current.route === "/sync" && <SyncPage />}
          </>
        )}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
