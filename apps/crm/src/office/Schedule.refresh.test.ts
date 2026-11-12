// @vitest-environment jsdom
import { act, createElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Schedule from "./Schedule";
import { queryCache } from "../lib/queryCache";
const mocks = vi.hoisted(() => ({ technicians: vi.fn(), routes: vi.fn(), scheduled: vi.fn(), unscheduled: vi.fn(), mutate: vi.fn() }));
vi.mock("../lib/auth", () => ({ useRoles: () => ({ sub: "refresh-owner", office: true, owner: true }) }));
vi.mock("./technicians", () => ({ technicianComplianceIssue: () => null }));
vi.mock("../lib/api", async (original) => ({
  ...await original<typeof import("../lib/api")>(),
  api: () => ({
    models: {
      Technician: { list: mocks.technicians }, Route: { listRouteByDate: mocks.routes },
      Job: { listJobByScheduledDate: mocks.scheduled, listJobByStatus: mocks.unscheduled },
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
  queryCache.activate(null); queryCache.activate("refresh-owner", ["OWNER"]);
  sessionStorage.clear();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-03T16:00:00Z"));
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  mocks.technicians.mockReset(); mocks.unscheduled.mockReset().mockResolvedValue({ data: [] }); mocks.mutate.mockReset();
  mocks.routes.mockReset().mockResolvedValue({ data: [] }); mocks.scheduled.mockReset().mockResolvedValue({ data: [] });
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
});

afterEach(async () => { await act(async () => root.unmount());
  queryCache.activate(null); container.remove(); vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllGlobals(); });

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
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Refresh schedule"]')!.click());
    expect(container.textContent).toContain("Current technician"); expect(container.textContent).toContain("Refreshing");
    await act(async () => refresh.resolve({ data: [tech("Current technician")] }));
    await act(async () => button("Assign").click());
    vi.advanceTimersByTime(2000); await act(async () => window.dispatchEvent(new Event("focus")));
    expect(mocks.technicians).toHaveBeenCalledTimes(2); expect(mocks.mutate).not.toHaveBeenCalled();
    expect(container.querySelector<HTMLButtonElement>('[aria-label="Refresh schedule"]')!.disabled).toBe(true);
    expect(container.textContent).toContain("Assign — Example Home");
  });
});

describe("schedule route ordering", () => {
  const date = "2026-11-03";
  const technician = "Current technician";
  function loadStops(jobs: { id: string; routeId: string; routeOrder: number }[]) {
    mocks.technicians.mockResolvedValue({ data: [tech(technician)] });
    mocks.routes.mockImplementation(async ({ date: day }: { date: string }) => ({
      data: day === date ? [...new Set(jobs.map((job) => job.routeId))].map((id) => ({
        id, technicianId: technician, date, status: "PLANNED",
      })) : [],
    }));
    mocks.scheduled.mockImplementation(async ({ scheduledDate }: { scheduledDate: string }) => ({
      data: scheduledDate === date ? jobs.map((job) => ({
        ...job, technicianId: technician, customerId: "customer", scheduledDate: date,
        status: "SCHEDULED", serviceType: job.id,
      })) : [],
    }));
    mocks.mutate.mockResolvedValue({ data: {} });
  }
  const arrows = (group: HTMLElement, arrow: string) =>
    Array.from(group.querySelectorAll("button")).filter((b) => b.textContent?.trim() === arrow);
  const stopTitles = (group: HTMLElement) =>
    Array.from(group.querySelectorAll(".list-row-title")).map((row) => row.textContent);

  it("keeps interleaved routes visible and swaps only neighbors on the same route", async () => {
    loadStops([
      { id: "First A stop", routeId: "route-a", routeOrder: 1 },
      { id: "Only B stop", routeId: "route-b", routeOrder: 2 },
      { id: "Last A stop", routeId: "route-a", routeOrder: 3 },
    ]);
    await act(async () => root.render(createElement(MemoryRouter, null, createElement(Schedule))));
    const groupA = container.querySelector<HTMLElement>('[aria-label="Route 1 stops"]')!;
    const groupB = container.querySelector<HTMLElement>('[aria-label="Route 2 stops"]')!;
    expect(groupA.textContent).toContain("First A stop");
    expect(groupA.textContent).toContain("Last A stop");
    expect(groupA.textContent).not.toContain("Only B stop");
    expect(groupB.textContent).toContain("Only B stop");
    expect(stopTitles(groupA)).toEqual(["1. Example Home", "2. Example Home"]);
    expect(stopTitles(groupB)).toEqual(["1. Example Home"]);
    expect(arrows(groupA, "↑").map((b) => b.disabled)).toEqual([true, false]);
    expect(arrows(groupA, "↓").map((b) => b.disabled)).toEqual([false, true]);
    expect(arrows(groupB, "↑")[0].disabled).toBe(true);
    expect(arrows(groupB, "↓")[0].disabled).toBe(true);
    await act(async () => arrows(groupA, "↓")[0].click());
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    expect(mocks.mutate).toHaveBeenCalledWith({
      jobId: "First A stop", operation: "REORDER", routeOrder: 3,
      otherJobId: "Last A stop", otherRouteOrder: 1,
    });
  });

  it("preserves a single route's numbering, boundaries and upward swap", async () => {
    loadStops([
      { id: "First stop", routeId: "route-a", routeOrder: 1 },
      { id: "Last stop", routeId: "route-a", routeOrder: 2 },
    ]);
    await act(async () => root.render(createElement(MemoryRouter, null, createElement(Schedule))));
    expect(container.querySelectorAll('section[aria-label$=" stops"]')).toHaveLength(1);
    const group = container.querySelector<HTMLElement>('[aria-label="Route 1 stops"]')!;
    expect(stopTitles(group)).toEqual(["1. Example Home", "2. Example Home"]);
    expect(arrows(group, "↑").map((b) => b.disabled)).toEqual([true, false]);
    expect(arrows(group, "↓").map((b) => b.disabled)).toEqual([false, true]);
    await act(async () => arrows(group, "↑")[1].click());
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    expect(mocks.mutate).toHaveBeenCalledWith({
      jobId: "Last stop", operation: "REORDER", routeOrder: 1,
      otherJobId: "First stop", otherRouteOrder: 2,
    });
  });
});
