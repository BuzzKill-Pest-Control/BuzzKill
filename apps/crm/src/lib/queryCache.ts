/** Server reads only: bounded memory for the current login, never browser storage. */
export type QueryKey = readonly (string | number | boolean | null)[];
export type CachedQuery<T> = { data: T; fetchedAt: number };
type Event = { kind: "identity" } | { kind: "invalidate"; resources: readonly string[] | null };
type Entry = CachedQuery<unknown> & { touchedAt: number };
export const QUERY_STALE_MS = 30_000;
const RETAIN_MS = 5 * 60_000;
const MAX_ENTRIES = 20;

export function createQueryCache(now = () => Date.now()) {
  let identity: string | null = null;
  let generation = 0;
  let revision = 0;
  const versions = new Map<string, number>();
  const entries = new Map<string, Entry>();
  const pending = new Map<string, { promise: Promise<CachedQuery<unknown>>; current: () => boolean; release: () => void }>();
  const listeners = new Set<(event: Event) => void>();
  const emit = (event: Event) => { for (const listener of [...listeners]) listener(event); };
  const resource = (key: QueryKey) => String(key[0]);
  const id = (key: QueryKey) => JSON.stringify(key);
  const prune = () => {
    const time = now();
    for (const [key, value] of entries) if (time - value.touchedAt >= RETAIN_MS) entries.delete(key);
    while (entries.size > MAX_ENTRIES) {
      const oldest = [...entries].sort((a, b) => a[1].touchedAt - b[1].touchedAt)[0];
      entries.delete(oldest[0]);
    }
  };
  return {
    identity: () => identity,
    generation: () => generation,
    scope: () => `${generation}:${identity ?? "signed-out"}`,
    subscribe(listener: (event: Event) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    activate(sub: string | null, groups: readonly string[] = []) {
      const next = sub ? JSON.stringify([sub, [...new Set(groups)].sort()]) : null;
      if (next === identity) return;
      identity = next; generation++; entries.clear(); pending.clear(); versions.clear();
      emit({ kind: "identity" });
    },
    invalidate(resources: readonly string[] | null = null) {
      if (!resources) { revision++; entries.clear(); pending.clear(); }
      else {
        for (const name of resources) versions.set(name, (versions.get(name) ?? 0) + 1);
        for (const key of [...entries.keys()]) if (resources.includes(String(JSON.parse(key)[0]))) entries.delete(key);
        for (const key of [...pending.keys()]) if (resources.includes(String(JSON.parse(key)[0]))) pending.delete(key);
      }
      emit({ kind: "invalidate", resources });
    },
    read<T>(key: QueryKey): CachedQuery<T> | null {
      if (!identity) return null;
      prune();
      const value = entries.get(id(key));
      if (!value) return null;
      value.touchedAt = now();
      return { data: value.data as T, fetchedAt: value.fetchedAt };
    },
    request<T>(key: QueryKey, load: () => Promise<T>) {
      const name = id(key), scope = identity, epoch = generation, version = versions.get(resource(key)) ?? 0, all = revision;
      let retained = true;
      const current = () => retained && identity === scope && generation === epoch && revision === all && (versions.get(resource(key)) ?? 0) === version;
      const shared = pending.get(name);
      if (scope && shared?.current()) return shared as { promise: Promise<CachedQuery<T>>; current: () => boolean };
      const request = { current, release: () => { retained = false; }, promise: Promise.resolve().then(load).then((data) => {
        const result = { data, fetchedAt: now() };
        if (scope && current()) { entries.set(name, { ...result, touchedAt: now() }); prune(); }
        return result;
      }).finally(() => { if (pending.get(name) === request) pending.delete(name); }) };
      if (scope) {
        pending.set(name, request);
        while (pending.size > MAX_ENTRIES) {
          const oldest = pending.keys().next().value!;
          pending.get(oldest)!.release(); pending.delete(oldest);
        }
      }
      return request;
    },
  };
}

export const queryCache = createQueryCache();

function refused(data: unknown): boolean {
  if (typeof data === "string") { try { data = JSON.parse(data); } catch { return false; } }
  if (!data || typeof data !== "object") return false;
  const value = data as Record<string, unknown>;
  return Boolean(value.refused);
}

/** Explicit write boundary. Keep domain refusals for each caller to interpret.
 * Unknown non-refused responses conservatively invalidate list reads; a null
 * payload is not proof of business success. Callers still interpret outcomes.
 * No optimistic values are ever inserted into this cache. */
export async function confirmedMutation<T extends { data?: unknown; errors?: readonly { message: string }[] }>(
  request: Promise<T>, resources: readonly string[] | null = null
): Promise<T> {
  const owner = queryCache.identity();
  const generation = queryCache.generation();
  const invalidate = () => {
    if (owner === queryCache.identity() && generation === queryCache.generation()) queryCache.invalidate(resources);
  };
  let result: T;
  try { result = await request; }
  catch (error) { invalidate(); throw error; } // The server may have committed before a connection failed.
  if (result?.errors?.length) {
    invalidate();
    throw new Error(result.errors.map((error) => error.message).join("; "));
  }
  // error/ok:false/null payloads may describe partial effects. Keep their caller's
  // business handling intact, but require a fresh server read on return.
  if (!refused(result?.data)) invalidate();
  return result;
}
