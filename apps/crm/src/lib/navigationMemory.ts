import type { CustomersTab } from "./customerTabs";
import { OPEN_LEAD_STAGES, type LeadStage } from "./leadStage";

const PREFIX = "bk-view-v1:";
const OWNER_KEY = `${PREFIX}owner`;

export type NavigationStore = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;
export type CustomersView = { tab: CustomersTab; query: string };
export type LeadsView = { mineOnly: boolean; stageFilter: LeadStage | "ALL" };

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function parseCustomersView(value: unknown): CustomersView | null {
  if (!record(value) || typeof value.tab !== "string" || !["ACTIVE", "INACTIVE", "GROUPS"].includes(value.tab) ||
      typeof value.query !== "string" || value.query.length > 500) return null;
  return { tab: value.tab as CustomersTab, query: value.query };
}

export function parseLeadsView(value: unknown): LeadsView | null {
  if (!record(value) || typeof value.mineOnly !== "boolean" ||
      typeof value.stageFilter !== "string" || !["ALL", ...OPEN_LEAD_STAGES].includes(value.stageFilter)) return null;
  return { mineOnly: value.mineOnly, stageFilter: value.stageFilter as LeadsView["stageFilter"] };
}

/** Reject impossible dates instead of letting Date silently roll into next month. */
export function parseScheduleDate(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}

export function clearNavigationMemory(store?: NavigationStore): void {
  try {
    const target = store ?? window.sessionStorage;
    for (let i = target.length - 1; i >= 0; i--) {
      const key = target.key(i);
      if (key?.startsWith(PREFIX)) target.removeItem(key);
    }
  } catch { /* A storage restriction must not prevent sign-out or navigation. */ }
}

/** One tab's view state belongs to its current login, including account switches. */
export function activateNavigationOwner(owner: string, store?: NavigationStore): void {
  if (!owner) return;
  try {
    const target = store ?? window.sessionStorage;
    if (target.getItem(OWNER_KEY) !== owner) {
      clearNavigationMemory(target);
      target.setItem(OWNER_KEY, owner);
    }
  } catch { /* In-memory React state still works when storage is unavailable. */ }
}

function key(owner: string, screen: string): string {
  return `${PREFIX}${owner}:${screen}`;
}

function trimHistory(owner: string, screen: string, store: NavigationStore): void {
  const match = /^(.*):(?:entry|scroll):(.+)$/.exec(screen);
  if (!match) return;
  const indexKey = key(owner, "history");
  let entries: { screen: string; entry: string }[] = [];
  try {
    const raw: unknown = JSON.parse(store.getItem(indexKey) ?? "[]");
    if (Array.isArray(raw)) entries = raw.filter((item) => record(item) &&
      typeof item.screen === "string" && typeof item.entry === "string") as typeof entries;
  } catch { /* Rebuild a corrupt index from the current visit. */ }
  entries = entries.filter((item) => item.screen !== match[1] || item.entry !== match[2]);
  entries.push({ screen: match[1], entry: match[2] });
  // Keep forty recent list visits, each with controls and one scroll position.
  // Older browser history can still use the latest per-screen defaults.
  for (const old of entries.splice(0, Math.max(0, entries.length - 40))) {
    store.removeItem(key(owner, `${old.screen}:entry:${old.entry}`));
    store.removeItem(key(owner, `${old.screen}:scroll:${old.entry}`));
  }
  store.setItem(indexKey, JSON.stringify(entries));
}

export function readNavigationValue<T>(
  owner: string, screen: string, parse: (value: unknown) => T | null,
  store?: NavigationStore
): T | null {
  if (!owner) return null;
  try {
    const target = store ?? window.sessionStorage;
    if (target.getItem(OWNER_KEY) !== owner) return null;
    const raw = target.getItem(key(owner, screen));
    return raw === null ? null : parse(JSON.parse(raw));
  } catch { return null; }
}

export function writeNavigationValue(
  owner: string, screen: string, value: unknown, store?: NavigationStore
): void {
  if (!owner) return;
  try {
    const target = store ?? window.sessionStorage;
    // A late unmount or request from a signed-out account cannot recreate its cache.
    if (target.getItem(OWNER_KEY) === owner) {
      target.setItem(key(owner, screen), JSON.stringify(value));
      trimHistory(owner, screen, target);
    }
  } catch { /* Private mode/quota must not break the screen. */ }
}

export function parseScroll(value: unknown): { context: string; top: number } | null {
  if (!record(value) || typeof value.context !== "string" || typeof value.top !== "number" ||
      !Number.isFinite(value.top) || value.top < 0) return null;
  return { context: value.context, top: value.top };
}
