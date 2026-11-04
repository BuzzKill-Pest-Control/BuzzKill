import { useCallback, useEffect, useRef, useState } from "react";
import { searchCustomers, opResult } from "./api";
import { normalizeCustomerSearchQuery, type CustomerSearchHit, type CustomerSearchPage, type SearchResume } from "./customerSearch";
import { LEAD_STAGE_LABEL } from "./leadStage";

type SearchState = {
  key: string;
  items: CustomerSearchHit[];
  sources: Map<string, string | null>;
  nextToken: string | null;
  searched: boolean;
  loading: boolean;
  error: string | null;
};

function empty(key: string): SearchState {
  return { key, items: [], sources: new Map(), nextToken: null, searched: false, loading: false, error: null };
}

/** Each explicit continuation does bounded server work; never drain every page. */
export function useCustomerSearch(query: string, owner: string, enabled: boolean, resume: SearchResume | null = null) {
  const startToken = resume?.cursor ?? null;
  const key = JSON.stringify([owner, query, startToken, resume?.customerId ?? null]);
  const [state, setState] = useState(() => empty(key));
  const current = useRef(state);
  const generation = useRef(0);
  const inFlight = useRef(false);
  const context = useRef({ key, enabled });
  context.current = { key, enabled };

  const update = (next: SearchState) => { current.current = next; setState(next); };
  const meaningful = Boolean(normalizeCustomerSearchQuery(query));

  const load = useCallback(async (append: boolean) => {
    if (!enabled || !owner || !normalizeCustomerSearchQuery(query) || inFlight.current) return;
    const prior = current.current.key === key ? current.current : empty(key);
    if (append && !prior.nextToken) return;
    const requestGeneration = generation.current;
    const sourceToken = append ? prior.nextToken : startToken;
    inFlight.current = true;
    update({ ...prior, loading: true, error: null });
    const isCurrent = () => generation.current === requestGeneration &&
      context.current.key === key && context.current.enabled;
    try {
      const result = opResult<CustomerSearchPage>(await searchCustomers({
        query, limit: 25, nextToken: sourceToken ?? undefined,
      }));
      if (!result || !Array.isArray(result.items) || result.items.length > 25 ||
          result.items.some((item) => !item || typeof item.id !== "string" || !item.id ||
            typeof item.displayName !== "string" || !["ACTIVE", "INACTIVE", "LEAD"].includes(item.status) ||
            !(item.leadStage === null || Object.prototype.hasOwnProperty.call(LEAD_STAGE_LABEL, item.leadStage))) ||
          !(result.nextToken === null || (typeof result.nextToken === "string" && result.nextToken.length > 0))) {
        throw new Error("The search did not return a complete result. Please try again.");
      }
      if (!isCurrent()) return;
      const items = [...new Map([
        ...(append ? prior.items : []), ...result.items,
      ].map((item) => [item.id, item])).values()];
      const sources = new Map(append ? prior.sources : []);
      for (const item of result.items) sources.set(item.id, sourceToken);
      update({ key, items, sources, nextToken: result.nextToken, searched: true, loading: false, error: null });
    } catch (error) {
      if (isCurrent()) update({
        ...prior, loading: false,
        error: error instanceof Error ? error.message : "Could not search the directory",
      });
    } finally {
      if (isCurrent()) inFlight.current = false;
    }
  }, [owner, query, enabled, key, startToken]);

  useEffect(() => {
    generation.current++;
    inFlight.current = false;
    update({ ...empty(key), loading: enabled && meaningful });
    const timeout = enabled && meaningful ? window.setTimeout(() => void load(false), 300) : null;
    return () => {
      if (timeout !== null) window.clearTimeout(timeout);
      generation.current++;
      inFlight.current = false;
    };
  }, [key, enabled, meaningful, load]);

  // Hide the prior query even during the render before its effect cleanup.
  const shown = state.key === key ? state : empty(key);
  return {
    ...shown,
    loading: shown.loading || (enabled && meaningful && !shown.searched && !shown.error),
    more: () => load(true),
    retry: () => load(Boolean(current.current.nextToken)),
    restart: () => load(false),
    sourceFor: (id: string) => shown.sources.get(id) ?? null,
  };
}
