import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  createKeyedSingleFlight,
  createRequestGuard,
  createSingleFlight,
  toMessage,
} from "./asyncCore";
import { useResumeRefresh } from "./useResumeRefresh";
import { queryCache, QUERY_STALE_MS, type CachedQuery, type QueryKey } from "./queryCache";

/**
 * The two hooks every screen in this app was hand-rolling.
 *
 * There were ~78 `const [error, setError] = useState<string | null>(null)`
 * declarations across ~45 files (13 in CustomerDetail alone), 52 busy flags,
 * 48 `finally` blocks and 94 `err instanceof Error ? …` ternaries — all
 * spelling the same load-or-act shape by hand.
 *
 * Copying it that many times meant the FIXES did not travel. Exactly one of
 * ~25 list screens (office/Customers.tsx) guarded against a stale response
 * overwriting a newer one; the comment there explains the bug, and nobody
 * else adopted it. That guard now lives in `asyncCore.ts` and every caller
 * gets it.
 *
 * These are deliberately thin: the logic worth testing is in `asyncCore`,
 * which is framework-free and unit-tested in the same node environment as
 * everything else here.
 */

export { toMessage } from "./asyncCore";

export type AsyncState<T> = {
  /** `null` until the first load resolves — the app's established "still
   *  loading" signal, which the existing Spinner-vs-content branches read. */
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Re-run the loader. Safe to pass straight to onClick. */
  reload: () => Promise<void>;
  /** Update in place after a mutation, instead of a full refetch. */
  setData: (next: T | null) => void;
  /** User/resume refresh keeps existing rows and respects editing/writes. */
  refresh: () => void;
  lastUpdatedAt: number | null;
  online: boolean;
  refreshSuspended: boolean;
};

export type LoadOptions = {
  refreshOnResume?: boolean; suspended?: boolean;
  /** Stable resource/filter key. Opt-in server reads only, never editable drafts. */
  cacheKey?: QueryKey; staleTimeMs?: number;
};

/**
 * Load when `deps` change, with the stale-response guard applied.
 *
 * `deps` is the dependency array for the loader, exactly like `useEffect`.
 * `fallbackMessage` is the error text when the failure carries none.
 */
export function useAsync<T>(
  load: () => Promise<T>,
  deps: unknown[],
  fallbackMessage = "Could not load",
  options: LoadOptions = {}
): AsyncState<T> {
  const scope = useSyncExternalStore(queryCache.subscribe, queryCache.scope, () => "signed-out");
  const keyText = options.cacheKey ? JSON.stringify(options.cacheKey) : null;
  const selection = keyText === null ? null : JSON.stringify([scope, keyText]);
  const cached = keyText && queryCache.identity() ? queryCache.read<T>(JSON.parse(keyText)) : null;
  const staleTime = options.staleTimeMs ?? QUERY_STALE_MS;
  const [state, setState] = useState(() => ({
    data: cached?.data ?? null as T | null, error: null as string | null,
    loading: !cached || Date.now() - cached.fetchedAt >= staleTime,
    updated: cached?.fetchedAt ?? null as number | null, selection,
  }));
  const guardRef = useRef(createRequestGuard());
  const mounted = useRef(false);
  const inFlight = useRef(false);
  const pendingRefresh = useRef(false);
  const suspended = useRef(options.suspended ?? false);
  suspended.current = options.suspended ?? false;
  const selectionRef = useRef(selection); selectionRef.current = selection;
  const keyRef = useRef(keyText); keyRef.current = keyText;
  const loadRef = useRef(load); loadRef.current = load;
  const runRef = useRef<(background?: boolean) => Promise<void>>(async () => {});
  useEffect(() => {
    const guard = createRequestGuard();
    guardRef.current = guard; mounted.current = true;
    return () => { mounted.current = false; guard.dispose(); };
  }, []);

  const run = useCallback(async (background = false) => {
    if (!mounted.current) return;
    if (keyRef.current && !queryCache.identity()) return;
    const forSelection = selectionRef.current;
    const guardCurrent = guardRef.current.begin();
    const isCurrent = () => guardCurrent() && forSelection === selectionRef.current;
    const key = keyRef.current;
    const loader = loadRef.current;
    const request = key && queryCache.identity() ? queryCache.request<T>(JSON.parse(key), loader) : null;
    inFlight.current = true; pendingRefresh.current = false;
    setState((current) => ({ ...current, error: null, loading: true }));
    try {
      const result: CachedQuery<T> = request ? await request.promise : { data: await loader(), fetchedAt: Date.now() };
      if (!isCurrent()) return;
      if (request && !request.current()) { pendingRefresh.current = true; return; }
      if (background && suspended.current) { pendingRefresh.current = true; return; }
      setState({ data: result.data, error: null, loading: false, updated: result.fetchedAt, selection: forSelection });
    } catch (error) {
      if (isCurrent() && (!request || request.current())) {
        setState((current) => ({ ...current, error: toMessage(error, fallbackMessage) }));
      }
    } finally {
      if (isCurrent()) {
        inFlight.current = false;
        setState((current) => ({ ...current, loading: false }));
        if (pendingRefresh.current && !suspended.current && document.visibilityState !== "hidden" && navigator.onLine !== false) {
          void runRef.current(true);
        }
      }
    }
  }, [fallbackMessage]);
  runRef.current = run;

  const reload = useCallback(() => run(), [run]);
  const refresh = useCallback(() => {
    if (suspended.current || inFlight.current || document.visibilityState === "hidden" || navigator.onLine === false) return;
    void run(true);
  }, [run]);
  const resume = useCallback(() => {
    const key = keyRef.current;
    const value = key && queryCache.identity() ? queryCache.read(JSON.parse(key)) : null;
    if (!pendingRefresh.current && value && Date.now() - value.fetchedAt < staleTime) return;
    refresh();
  }, [refresh, staleTime]);
  const online = useResumeRefresh(resume, options.refreshOnResume === true);

  useEffect(() => queryCache.subscribe((event) => {
    const key = keyRef.current;
    if (event.kind !== "invalidate" || !key || (event.resources && !event.resources.includes(String(JSON.parse(key)[0])))) return;
    pendingRefresh.current = true;
    if (!suspended.current && document.visibilityState !== "hidden" && navigator.onLine !== false) void runRef.current(true);
  }), []);
  useEffect(() => {
    if (!options.suspended && pendingRefresh.current && !inFlight.current) refresh();
  }, [options.suspended, refresh]);

  useEffect(() => {
    guardRef.current.begin();
    inFlight.current = false;
    pendingRefresh.current = false;
    const value = keyText && queryCache.identity() ? queryCache.read<T>(JSON.parse(keyText)) : null;
    setState({ data: value?.data ?? null, updated: value?.fetchedAt ?? null, error: null,
      loading: !value || Date.now() - value.fetchedAt >= staleTime, selection });
    if (!value || Date.now() - value.fetchedAt >= staleTime) {
      if (value && suspended.current) pendingRefresh.current = true;
      else void run(Boolean(value));
    }
    // Loader closures are deliberately excluded; selection contains the stable key/account.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, selection]);

  // A changed key/account must never display the previous selection even for one render.
  const selected = state.selection === selection ? state : {
    data: cached?.data ?? null, error: null, loading: !cached || Date.now() - cached.fetchedAt >= staleTime,
    updated: cached?.fetchedAt ?? null,
  };
  const setData = useCallback((data: T | null) => setState((current) => ({ ...current, data })), []);
  return {
    data: selected.data, loading: selected.loading, error: selected.error, reload, setData, refresh,
    lastUpdatedAt: selected.updated, online, refreshSuspended: options.suspended ?? false,
  };
}

export type ActionState<A extends unknown[]> = {
  /** Runs the action. Resolves `true` on success, `false` if it threw or was
   *  refused as a double-submit — so a caller can close a sheet only when the
   *  write actually landed. Never rejects: the message is in `error`. */
  run: (...args: A) => Promise<boolean>;
  busy: boolean;
  error: string | null;
  clearError: () => void;
};

/** A mutation: busy flag, captured error, and no double-submit. */
export function useAction<A extends unknown[]>(
  action: (...args: A) => Promise<unknown>,
  fallbackMessage = "Could not save"
): ActionState<A> {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gateRef = useRef(createSingleFlight());
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const actionRef = useRef(action);
  actionRef.current = action;

  const run = useCallback(
    async (...args: A): Promise<boolean> => {
      if (!gateRef.current.tryEnter()) return false;
      setBusy(true);
      setError(null);
      try {
        await actionRef.current(...args);
        return true;
      } catch (err) {
        if (aliveRef.current) setError(toMessage(err, fallbackMessage));
        return false;
      } finally {
        gateRef.current.exit();
        if (aliveRef.current) setBusy(false);
      }
    },
    [fallbackMessage]
  );

  return { run, busy, error, clearError: useCallback(() => setError(null), []) };
}

export type KeyedActionState = {
  /** Runs `fn` under `key`. Resolves `true` on success, `false` if it threw or
   *  the SAME key was already in flight. Never rejects. */
  run: (key: string, fn: () => Promise<unknown>) => Promise<boolean>;
  /** Which key is working — drives the pressed button's spinner. */
  busyKey: string | null;
  error: string | null;
  clearError: () => void;
};

/**
 * `useAction` for a screen that routes many independent writes through one
 * handler, keyed by the button that was pressed.
 *
 * `useAction` is the wrong shape there: its gate is per-hook, so one write in
 * flight would silently refuse a press on an unrelated button. Here the gate
 * is per key, and `busyKey` replaces the `busyAction`/`busyId` useState that
 * these screens were already keeping by hand.
 */
export function useKeyedAction(fallbackMessage = "Could not save"): KeyedActionState {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const gateRef = useRef(createKeyedSingleFlight());
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const run = useCallback(
    async (key: string, fn: () => Promise<unknown>): Promise<boolean> => {
      if (!gateRef.current.tryEnter(key)) return false;
      setBusyKey(key);
      setError(null);
      try {
        await fn();
        return true;
      } catch (err) {
        if (aliveRef.current) setError(toMessage(err, fallbackMessage));
        return false;
      } finally {
        gateRef.current.exit(key);
        // Another key may still be running; only clear the spinner if this was
        // the last one out.
        if (aliveRef.current && !gateRef.current.busy) setBusyKey(null);
      }
    },
    [fallbackMessage]
  );

  return { run, busyKey, error, clearError: useCallback(() => setError(null), []) };
}
