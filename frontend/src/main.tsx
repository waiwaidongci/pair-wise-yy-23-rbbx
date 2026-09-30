import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { routes } from "./router/routes";
import { SyncStatusBar } from "./components/sync/SyncStatusBar";
import { LearnPage } from "./pages/LearnPage";
import { PracticePage } from "./pages/PracticePage";
import { MistakesPage } from "./pages/MistakesPage";
import { ProgressPage } from "./pages/ProgressPage";
import { useSyncStore } from "./stores/SyncStore";
import "./styles.css";

const PAGE_COMPONENTS: Record<string, () => JSX.Element> = {
  "/learn": LearnPage,
  "/practice": PracticePage,
  "/mistakes": MistakesPage,
  "/progress": ProgressPage
};

function App() {
  const init = useSyncStore((state) => state.init);
  const ready = useSyncStore((state) => state.ready);
  const [active, setActive] = useState<string>(() => {
    const hash = window.location.hash.replace("#", "");
    return routes.some((route) => route.route === hash) ? hash : routes[0].route;
  });

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    window.location.hash = active;
  }, [active]);

  const CurrentPage = PAGE_COMPONENTS[active] ?? LearnPage;

  return (
    <div className="shell">
      <aside>
        <div className="brand">盲文点字学习训练器</div>
        <nav>
          {routes.map((route) => (
            <button key={route.route} className={active === route.route ? "active" : ""} onClick={() => setActive(route.route)}>
              {route.name}
            </button>
          ))}
        </nav>
      </aside>
      <main className="page">
        <SyncStatusBar />
        {ready ? (
          <CurrentPage />
        ) : (
          <section className="page-body">
            <p className="hint">正在打开本地离线训练库并兼容迁移历史数据…</p>
          </section>
        )}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
