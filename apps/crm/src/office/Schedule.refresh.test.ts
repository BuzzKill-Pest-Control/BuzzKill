// @vitest-environment jsdom
import { act, createElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Schedule from "./Schedule";
const mocks = vi.hoisted(() => ({ technicians: vi.fn(), unscheduled: vi.fn(), mutate: vi.fn() }));
vi.mock("../lib/auth", () => ({ useRoles: () => ({ sub: "refresh-owner", office: true, owner: true }) }));
vi.mock("./technicians", () => ({ technicianComplianceIssue: () => null }));
vi.mock("../lib/api", async (original) => ({
  ...await original<typeof import("../lib/api")>(),
  api: () => ({
    models: {
      Technician: { list: mocks.technicians }, Route: { listRouteByDate: async () => ({ data: [] }) },
      Job: { listJobByScheduledDate: async () => ({ data: [] }), listJobByStatus: mocks.unscheduled },
      Customer: { list: async () => ({ data: [{ id: "customer", displayName: "Example Home" }] }) },
    },
    mutations: { updateJobSchedule: mocks.mutate },
  }),
  unwrap: (result: { data: unknown }) => result.data,
  opResult: (result: { data: unknown }) => result.data,
  opResultUnlessRefused: (result: { data: unknown }) => result.data,
}));
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((yes) => { resolve = yes; }); return { promise, resolve }; }
let container: HTMLDivElement, root: Root;
const tech = (name: string) => ({ id: name, name, active: true, licenseNumber: "example", licenseExpiresOn: "2030-01-01" });
const button = (text: string) => Array.from(container.querySelectorAll("button")).find((b) => b.textContent?.includes(text))!;
beforeEach(() => {
  sessionStorage.clear();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-03T16:00:00Z"));
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  mocks.technicians.mockReset(); mocks.unscheduled.mockReset().mockResolvedValue({ data: [] }); mocks.mutate.mockReset();
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("schedule refresh", () => {
  it("paginates the status-only pool and includes an undated job from a later page", async () => {
    mocks.technicians.mockResolvedValue({ data: [tech("Current technician")] });
    mocks.unscheduled.mockImplementation(async (_key: unknown, options: { nextToken?: string | null }) => options.nextToken ? {
      data: [{ id: "undated", customerId: "customer", status: "UNSCHEDULED", serviceType: "Undated rebooking" }], nextToken: null,
    } : {
      data: [{ id: "dated", customerId: "customer", status: "UNSCHEDULED", scheduledDate: "2026-12-01", serviceType: "Future target visit" }], nextToken: "second-page",
    });
    await act(async () => root.render(createElement(MemoryRouter, null, createElement(Schedule))));
    expect(mocks.unscheduled).toHaveBeenNthCalledWith(1, { status: "UNSCHEDULED" }, { limit: 500, nextToken: undefined });
    expect(mocks.unscheduled).toHaveBeenNthCalledWith(2, { status: "UNSCHEDULED" }, { limit: 500, nextToken: "second-page" });
    expect(container.textContent).toContain("Future target visit");
    expect(container.textContent).toContain("Undated rebooking");
  });

  it("does not let an older week's completion replace the selected week's rows", async () => {
    const old = deferred<{ data: ReturnType<typeof tech>[] }>();
    mocks.technicians.mockReturnValueOnce(old.promise).mockResolvedValueOnce({ data: [tech("Current technician")] });
    await act(async () => root.render(createElement(MemoryRouter, null, createElement(Schedule))));
    await act(async () => button("Next week").click());
    expect(container.textContent).toContain("Current technician");
    await act(async () => old.resolve({ data: [tech("Old technician")] }));
    expect(container.textContent).toContain("Current technician"); expect(container.textContent).not.toContain("Old technician");
  });
  it("refreshes the board in place and pauses while assigning a stop", async () => {
    const refresh = deferred<{ data: ReturnType<typeof tech>[] }>();
    mocks.technicians.mockResolvedValueOnce({ data: [tech("Current technician")] }).mockReturnValueOnce(refresh.promise);
    mocks.unscheduled.mockResolvedValue({ data: [{ id: "job", customerId: "customer", status: "UNSCHEDULED", serviceType: "Rodent control" }] });
    await act(async () => root.render(createElement(MemoryRouter, null, createElement(Schedule))));
    await act(async () => window.dispatchEvent(new Event("focus")));
    expect(container.textContent).toContain("Current technician"); expect(container.textContent).toContain("Refreshing");
    await act(async () => refresh.resolve({ data: [tech("Current technician")] }));
    await act(async () => button("Assign").click());
    vi.advanceTimersByTime(2000); await act(async () => window.dispatchEvent(new Event("focus")));
    expect(mocks.technicians).toHaveBeenCalledTimes(2); expect(mocks.mutate).not.toHaveBeenCalled();
    expect(container.querySelector<HTMLButtonElement>('[aria-label="Refresh schedule"]')!.disabled).toBe(true);
    expect(container.textContent).toContain("Assign — Example Home");
  });
});
