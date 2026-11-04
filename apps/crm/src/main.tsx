import "./lib/monitoringBootstrap";
import React from "react";
import ReactDOM from "react-dom/client";
import AppStartup from "./AppStartup";
import ScreenErrorBoundary from "./components/ScreenErrorBoundary";
import "./index.css";

// PWA: register the service worker (production builds only — the dev server
// would fight HMR).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* app works fine without it */
    });
  });
}

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    {import.meta.env.VITE_BUZZKILL_MIGRATION_PREVIEW === "true" && (
      <div role="status" style={{ background: "#fff3cd", color: "#332701", padding: "12px", textAlign: "center" }}>
        Migration preview — booking, payments, and business actions are disabled. Administrator sign-in is available only when explicitly enabled.
      </div>
    )}
    <ScreenErrorBoundary resetKey="startup"><AppStartup /></ScreenErrorBoundary>
  </React.StrictMode>
);
