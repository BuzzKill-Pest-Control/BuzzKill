import { useCallback, useEffect, useRef, useState } from "react";
import { toMessage, useAsync } from "./useAsync";
import type { RecordPage } from "./customerRecordReads";

/** One private record section. First access reads one page; refresh preserves
 * explicitly loaded depth. Closed sections become dirty rather than fetching. */
export function useRecordSection<T extends { id: string }>(key: string, readPage: (nextToken?: string) => Promise<RecordPage<T>>) {
  const [access, setAccess] = useState({ key: "", open: false });
  const enabled = access.key === key;
  const open = enabled && access.open;
  const current = useRef({ key, open }); current.current = { key, open };
  const mounted = useRef(false), generation = useRef(0), pending = useRef<number | null>(null);
  const sequence = useRef(0), dirty = useRef(false), depth = useRef({ key, pages: 1 });
  const loader = useRef(readPage); loader.current = readPage;
  const [more, setMore] = useState({ key, loading: false, error: null as string | null });
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current++; pending.current = null; }; }, []);
  const freshness = useAsync<(RecordPage<T> & { key: string; revision: number }) | null>(async () => {
    const revision = ++generation.current; pending.current = null;
    setMore({ key, loading: false, error: null });
    if (!enabled) return null;
    dirty.current = false;
    if (depth.current.key !== key) depth.current = { key, pages: 1 };
    const budget = depth.current.pages;
    let page = await loader.current();
    for (let count = 1; count < budget && page.nextToken; count++) {
      if (!mounted.current || generation.current !== revision || current.current.key !== key) break;
      const next = await loader.current(page.nextToken);
      page = { items: merge(page.items, next.items), nextToken: next.nextToken };
    }
    return { ...page, key, revision };
  }, [key, enabled], "This section could not be loaded");
  const data = freshness.data?.key === key ? freshness.data : null;
  const setOpen = useCallback((value: boolean) => {
    setAccess({ key, open: value });
    if (value && enabled && dirty.current) void freshness.reload();
  }, [key, enabled, freshness.reload]);
  const refresh = useCallback(async () => {
    if (current.current.key !== key || !current.current.open) { dirty.current = true; return; }
    await freshness.reload();
  }, [key, freshness.reload]);
  const loadMore = useCallback(async () => {
    if (!mounted.current || !current.current.open || !data?.nextToken || freshness.loading || pending.current !== null) return;
    const request = ++sequence.current, revision = generation.current;
    pending.current = request; setMore({ key, loading: true, error: null });
    try {
      const page = await loader.current(data.nextToken);
      if (!mounted.current || current.current.key !== key || !current.current.open || generation.current !== revision || pending.current !== request) return;
      depth.current.pages++;
      freshness.setData({ ...data, items: merge(data.items, page.items), nextToken: page.nextToken });
    } catch (error) {
      if (mounted.current && current.current.key === key && generation.current === revision && pending.current === request) {
        setMore({ key, loading: false, error: toMessage(error, "More records could not be loaded") });
      }
    } finally {
      if (pending.current === request) { pending.current = null; if (mounted.current) setMore((held) => ({ ...held, loading: false })); }
    }
  }, [data, freshness.loading, freshness.setData, key]);
  return { ...freshness, data, open, setOpen, refresh, loadMore, moreLoading: more.key === key && more.loading, moreError: more.key === key ? more.error : null };
}
function merge<T extends { id: string }>(prior: T[], next: T[]): T[] {
  return [...new Map([...prior, ...next].map((row) => [row.id, row])).values()];
}
