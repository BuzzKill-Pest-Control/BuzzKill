import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { queryCache } from "./queryCache";

// All sign-out paths, including Authenticator and magic-link account changes.
Hub.listen("auth", ({ payload }) => {
  if (payload.event === "tokenRefresh") queryCache.renew();
  if (["signedOut", "signedIn", "tokenRefresh_failure"].includes(payload.event)) queryCache.activate(null);
});

export type Roles = {
  /** Every staff capability: office work, money movement, invites, role
   *  changes. The consolidated staff seat (OFFICE + FINANCE folded in). */
  owner: boolean;
  /** Day-to-day office work. Alias of `owner` now that OFFICE folded into it —
   *  kept so the many `roles.office` UI branches read as intent. */
  office: boolean;
  /** May move money. Alias of `owner` now that FINANCE folded into it. */
  finance: boolean;
  tech: boolean;
  customer: boolean;
  /** All Cognito groups, including dynamic cus-/grp- groups. */
  groups: string[];
  sub: string;
  email: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const RolesContext = createContext<Roles | null>(null);

export function RolesProvider({ children }: { children: ReactNode }) {
  const request = useRef(0);
  const [state, setState] = useState<Omit<Roles, "refresh">>({
    owner: false,
    office: false,
    finance: false,
    tech: false,
    customer: false,
    groups: [],
    sub: "",
    email: null,
    loading: true,
  });

  const refresh = useCallback(async () => {
    const current = ++request.current;
    try {
      const session = await fetchAuthSession();
      if (current !== request.current) return;
      const payload = session.tokens?.accessToken.payload;
      const groups = (payload?.["cognito:groups"] as string[] | undefined) ?? [];
      const idPayload = session.tokens?.idToken?.payload;
      // Staff roles are consolidated to OWNER + TECH. office/finance are aliases
      // of owner now that OFFICE/FINANCE folded into it — this mirrors
      // callerIsOffice/callerIsFinance in amplify/functions/shared/authz.
      const owner = groups.includes("OWNER");
      queryCache.activate((payload?.sub as string | undefined) ?? null, groups);
      setState({
        owner,
        office: owner,
        finance: owner,
        tech: groups.includes("TECH"),
        customer: groups.includes("CUSTOMER"),
        groups,
        sub: (payload?.sub as string | undefined) ?? "",
        email: (idPayload?.email as string | undefined) ?? null,
        loading: false,
      });
    } catch {
      if (current !== request.current) return;
      // A lookup failure pauses reads; only verified account changes or auth events end the login.
      queryCache.renew();
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    queryCache.activate(null);
    void refresh();
    const stop = Hub.listen("auth", ({ payload }) => {
      if (payload.event === "tokenRefresh" || payload.event === "signedIn") void refresh();
      if (payload.event === "signedOut" || payload.event === "tokenRefresh_failure") {
        request.current++;
        setState({ owner: false, office: false, finance: false, tech: false, customer: false,
          groups: [], sub: "", email: null, loading: false });
      }
    });
    return () => { request.current++; stop(); queryCache.activate(null); };
  }, [refresh]);

  return (
    <RolesContext.Provider value={{ ...state, refresh }}>
      {children}
    </RolesContext.Provider>
  );
}

export function useRoles(): Roles {
  const ctx = useContext(RolesContext);
  if (!ctx) throw new Error("useRoles must be used inside RolesProvider");
  return ctx;
}

/** Customer ids this (portal) user can see via dynamic cus- groups. */
export function myCustomerIds(roles: Roles): string[] {
  return roles.groups
    .filter((g) => g.startsWith("cus-"))
    .map((g) => g.slice(4));
}

/** CustomerGroup ids this user belongs to via dynamic grp- groups. */
export function myGroupIds(roles: Roles): string[] {
  return roles.groups
    .filter((g) => g.startsWith("grp-"))
    .map((g) => g.slice(4));
}
