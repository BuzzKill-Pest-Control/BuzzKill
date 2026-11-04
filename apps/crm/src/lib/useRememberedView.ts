import { useCallback, useEffect, useLayoutEffect, useState, type SetStateAction } from "react";
import { Hub } from "aws-amplify/utils";
import { useLocation } from "react-router-dom";
import { useRoles } from "./auth";
import {
  activateNavigationOwner,
  clearNavigationMemory,
  parseScroll,
  readNavigationValue,
  writeNavigationValue,
} from "./navigationMemory";

Hub.listen("auth", ({ payload }) => {
  if (payload.event === "signedOut") clearNavigationMemory();
});

/** Remember view controls only, in this browser tab and for this login. */
export function useRememberedView<T>(
  screen: string, parse: (value: unknown) => T | null, initial: () => T
): [T, (next: SetStateAction<T>) => void] {
  const { sub: owner } = useRoles();
  const { key: entry } = useLocation();
  const entryKey = `${screen}:entry:${entry}`;
  const restore = () => readNavigationValue(owner, entryKey, parse) ??
    readNavigationValue(owner, screen, parse) ?? initial();
  const [saved, setSaved] = useState(() => ({ owner, entry, value: restore() }));
  const value = saved.owner === owner && saved.entry === entry ? saved.value : restore();

  useLayoutEffect(() => {
    activateNavigationOwner(owner);
    setSaved((current) => current.owner === owner && current.entry === entry ? current : {
      owner, entry, value: readNavigationValue(owner, entryKey, parse) ??
        readNavigationValue(owner, screen, parse) ?? initial(),
    });
  }, [owner, entry, entryKey, screen, parse, initial]);

  useEffect(() => {
    if (saved.owner === owner && saved.entry === entry) {
      writeNavigationValue(owner, entryKey, saved.value);
      writeNavigationValue(owner, screen, saved.value);
    }
  }, [owner, entry, entryKey, screen, saved]);

  const setValue = useCallback((next: SetStateAction<T>) => {
    setSaved((current) => {
      const prior = current.owner === owner && current.entry === entry ? current.value : initial();
      return { owner, entry, value: typeof next === "function" ? (next as (value: T) => T)(prior) : next };
    });
  }, [owner, entry, initial]);
  return [value, setValue];
}

/** Restore only after the selected list has rendered, never over a loading spinner. */
export function useRememberedScroll(screen: string, ready: boolean, context: string): void {
  const { sub: owner } = useRoles();
  const { key: entry } = useLocation();
  useLayoutEffect(() => {
    if (!ready) return;
    const scrollKey = `${screen}:scroll`;
    const entryScrollKey = `${scrollKey}:${entry}`;
    const saved = readNavigationValue(owner, entryScrollKey, parseScroll) ??
      readNavigationValue(owner, scrollKey, parseScroll);
    window.scrollTo(0, saved?.context === context ? saved.top : 0);
    const save = () => {
      const position = { context, top: window.scrollY };
      writeNavigationValue(owner, entryScrollKey, position);
      writeNavigationValue(owner, scrollKey, position);
    };
    window.addEventListener("pagehide", save);
    return () => {
      save();
      window.removeEventListener("pagehide", save);
      window.scrollTo(0, 0);
    };
  }, [owner, entry, screen, ready, context]);
}
