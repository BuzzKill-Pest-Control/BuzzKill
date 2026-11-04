import { useCallback, useEffect, useRef, useState } from "react";
import { searchCustomers, opResult } from "./api";
import { normalizeCustomerSearchQuery, type CustomerSearchHit, type CustomerSearchPage } from "./customerSearch";
import { LEAD_STAGE_LABEL } from "./leadStage";

type SearchState = {
  owner: string;
  query: string;
  items: CustomerSearchHit[];
  nextToken: string | null;
  searched: boolean;
  loading: boolean;
  error: string | null;
};

function empty(owner: string, query: string): SearchState {
  return { owner, query, items: [], nextToken: null, searched: false, loading: false, error: null };
}

/** Each explicit continuation does bounded server work; never drain every page. */
export function useCustomerSearch(query: string, owner: string, enabled: boolean) {
  const [state, setState] = useState(() => empty(owner, query));
  const current = useRef(state);
  const generation = useRef(0);
  const inFlight = useRef(false);
  const context = useRef({ owner, query, enabled });
  context.current = { owner, query, enabled };

  const update = (next: SearchState) => { current.current = next; setState(next); };
  const meaningful = Boolean(normalizeCustomerSearchQuery(query));

  const load = useCallback(async (append: boolean) => {
    if (!enabled || !owner || !normalizeCustomerSearchQuery(query) || inFlight.current) return;
    const prior = current.current.owner === owner && current.current.query === query
      ? current.current : empty(owner, query);
    if (append && !prior.nextToken) return;
    const requestGeneration = generation.current;
    inFlight.current = true;
    update({ ...prior, loading: true, error: null });
    const isCurrent = () => generation.current === requestGeneration &&
      context.current.owner === owner && context.current.query === query && context.current.enabled;
    try {
      const result = opResult<CustomerSearchPage>(await searchCustomers({
        query, limit: 25, nextToken: append ? prior.nextToken : undefined,
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
      update({ owner, query, items, nextToken: result.nextToken, searched: true, loading: false, error: null });
    } catch (error) {
      if (isCurrent()) update({
        ...prior, loading: false,
        error: error instanceof Error ? error.message : "Could not search the directory",
      });
    } finally {
      if (isCurrent()) inFlight.current = false;
    }
  }, [owner, query, enabled]);

  useEffect(() => {
    generation.current++;
    inFlight.current = false;
    update({ ...empty(owner, query), loading: enabled && meaningful });
    const timeout = enabled && meaningful ? window.setTimeout(() => void load(false), 300) : null;
    return () => {
      if (timeout !== null) window.clearTimeout(timeout);
      generation.current++;
      inFlight.current = false;
    };
  }, [owner, query, enabled, meaningful, load]);

  // Hide the prior query even during the render before its effect cleanup.
  const shown = state.owner === owner && state.query === query ? state : empty(owner, query);
  return {
    ...shown,
    loading: shown.loading || (enabled && meaningful && !shown.searched && !shown.error),
    more: () => load(true),
    retry: () => load(Boolean(current.current.nextToken)),
    restart: () => load(false),
  };
}
