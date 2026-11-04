import { lazy, Suspense, useMemo, useState, type ComponentType } from "react";
import { useLocation } from "react-router-dom";
import ScreenErrorBoundary from "../components/ScreenErrorBoundary";
import { Spinner } from "../ui/kit";

/** Import only on render or navigation intent. Retry creates a new lazy type:
 * React itself retains a rejected promise even after our loader is reset. */
export function lazyScreen<Props extends object>(loader: () => Promise<{ default: ComponentType<Props> }>) {
  let pending: ReturnType<typeof loader> | null = null;
  const load = () => {
    if (!pending) pending = loader().catch((error) => { pending = null; throw error; });
    return pending;
  };
  function Screen(props: Props) {
    const { pathname } = useLocation();
    const [attempt, setAttempt] = useState(0);
    // This wrapper forwards ordinary screen props, never component refs.
    const Loaded = useMemo(() => lazy(load), [pathname, attempt]) as unknown as ComponentType<Props>;
    return (
      <ScreenErrorBoundary resetKey={JSON.stringify([pathname, attempt])} onRetry={() => setAttempt((value) => value + 1)}>
        <Suspense fallback={<Spinner label="Loading screen…" />}><Loaded {...props} /></Suspense>
      </ScreenErrorBoundary>
    );
  }
  return { Screen, preload: () => load().then(() => undefined, () => undefined) };
}
