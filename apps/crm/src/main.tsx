import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { connectBackend } from "./lib/backend";

// PWA: register the service worker (production builds only — the dev server
// would fight HMR).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* app works fine without it */
    });
  });
}

connectBackend().then((backendReady) => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
    {import.meta.env.VITE_BUZZKILL_MIGRATION_PREVIEW === "true" && (
      <div role="status" style={{ background: "#fff3cd", color: "#332701", padding: "12px", textAlign: "center" }}>
        Migration preview — booking, payments, email links, and business actions are disabled.
      </div>
    )}
      <App backendReady={backendReady} />
    </React.StrictMode>
  );
});
