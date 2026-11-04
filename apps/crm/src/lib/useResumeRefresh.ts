import { useEffect, useRef, useState } from "react";

/** The browser can announce one return through focus, visibility, and online. */
export function useResumeRefresh(refresh: () => void, enabled: boolean): boolean {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine !== false);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const lastRequest = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const resume = () => {
      setOnline(navigator.onLine !== false);
      if (document.visibilityState === "hidden" || navigator.onLine === false) return;
      const now = Date.now();
      if (lastRequest.current !== null && now - lastRequest.current < 1000) return;
      lastRequest.current = now;
      refreshRef.current();
    };
    const offline = () => setOnline(false);
    window.addEventListener("focus", resume);
    window.addEventListener("online", resume);
    window.addEventListener("offline", offline);
    document.addEventListener("visibilitychange", resume);
    return () => {
      window.removeEventListener("focus", resume);
      window.removeEventListener("online", resume);
      window.removeEventListener("offline", offline);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [enabled]);

  return online;
}
