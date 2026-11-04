import { useEffect, useRef, useState } from "react";
import App from "./App";
import { connectBackend } from "./lib/backend";
import { Spinner } from "./ui/kit";

/** Paint immediately while generated configuration loads. A rejected load is
 * raised through the monitored root boundary, with an explicit reload action. */
export default function AppStartup({ connect = connectBackend }: { connect?: () => Promise<boolean> }) {
  const pending = useRef<Promise<boolean> | null>(null);
  const [ready, setReady] = useState<boolean | null>(null);
  const [failure, setFailure] = useState<{ error: unknown } | null>(null);
  useEffect(() => {
    let current = true;
    if (!pending.current) pending.current = Promise.resolve().then(connect);
    void pending.current.then((value) => { if (current) setReady(value); }, (error) => { if (current) setFailure({ error }); });
    return () => { current = false; };
  }, [connect]);
  if (failure) throw failure.error;
  return ready === null ? <div className="auth-shell"><Spinner label="Starting BuzzKill…" /></div> : <App backendReady={ready} />;
}
