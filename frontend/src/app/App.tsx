import { useEffect, useMemo, useState } from "react";
import DemoPage from "@pages/DemoPage";
import NetworkPage from "@pages/NetworkPage";
import ModeSwitcher from "@components/controls/ModeSwitcher";
import ThemeToggle from "@components/controls/ThemeToggle";
import FormulaBackdrop from "@components/backdrop/FormulaBackdrop";
import "@styles/global.css";

const modes = ["demo", "network"] as const;
type Mode = (typeof modes)[number];
type Theme = "dark" | "light";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem("qt-theme");
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function App() {
  const [mode, setMode] = useState<Mode>("demo");
  const [theme, setTheme] = useState<Theme>(() => {
    const initial = getInitialTheme();
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", initial);
    }
    return initial;
  });
  const docsUrl = (import.meta.env.VITE_DOCS_URL as string | undefined)?.trim();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("qt-theme", theme);
  }, [theme]);

  const content = useMemo(() => {
    if (mode === "network") {
      return <NetworkPage />;
    }
    return <DemoPage />;
  }, [mode]);

  return (
    <div className="app-shell">
      <FormulaBackdrop />
      <header className="app-header">
        <div>
          <p className="eyebrow">Quantum Teleportation Visualizer</p>
          <h1 className="title">Наглядная телепортация кубита</h1>
          <p className="subtitle">
            Два режима работы: локальная демонстрация и сетевое взаимодействие с
            сервером. Всё, чтобы увидеть, что телепортация - это аккуратный
            информационный протокол.
          </p>
        </div>
        <div className="header-actions">
          <ThemeToggle theme={theme} onToggle={setTheme} />
          <ModeSwitcher mode={mode} onChange={setMode} />
        </div>
      </header>
      <main>{content}</main>
      {docsUrl ? (
        <footer className="app-footer">
          Подробная документация и физическое обоснование доступны по{" "}
          <a href={docsUrl} target="_blank" rel="noreferrer">
            ссылке
          </a>
          .
        </footer>
      ) : null}
    </div>
  );
}

export default App;
