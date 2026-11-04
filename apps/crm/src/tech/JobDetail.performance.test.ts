// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import TechJob from "./JobDetail";
import { queryCache } from "../lib/queryCache";
const mocks = vi.hoisted(() => ({ full: vi.fn(), current: vi.fn(), history: vi.fn(), save: vi.fn(), end: vi.fn(), finalize: vi.fn(), acknowledge: vi.fn(), order: [] as string[] }));
vi.mock("../lib/queryCache", async (original) => ({ ...await original<typeof import("../lib/queryCache")>(), confirmedMutation: (pending: unknown) => pending }));
vi.mock("../lib/api", () => ({
  technicianJob: mocks.full, technicianJobCurrent: mocks.current, technicianJobHistory: mocks.history,
  opResult: (response: { data?: unknown; errors?: { message: string }[] }) => {
    if (response.errors?.length) throw new Error(response.errors[0].message);
    return typeof response.data === "string" ? JSON.parse(response.data) : response.data;
  },
  api: () => ({ mutations: { saveServiceReportDraft: mocks.save, endApplication: mocks.end, finalizeServiceReport: mocks.finalize, acknowledgePacket: mocks.acknowledge } }),
}));
vi.mock("../components/DocButton", () => ({ default: ({ docKey }: { docKey: string }) => createElement("a", { "data-document": docKey }, "Open report") }));
vi.mock("../components/ReportPhotos", () => ({ default: () => null }));
const job = { id: "job", customerId: "customer", technicianId: "tech", status: "IN_PROGRESS", type: "SERVICE", serviceType: "Pest visit", scheduledDate: "2026-11-04" };
const report = { id: "draft", jobId: "job", customerId: "customer", technicianId: "tech", status: "DRAFT", servicesPerformed: "Initial words", inspectionOnly: true, productsUsed: "[]", geoLat: 42, geoLng: -71, geoAccuracyM: 5, geoCapturedAt: "2026-11-04T15:00:00Z" };
const recent = { id: "prior", status: "COMPLETED", serviceType: "Previous treatment", scheduledDate: "2026-10-04", findingsUnavailable: true };
function fixture(overrides: Record<string, unknown> = {}) {
  return { job, customer: { id: "customer", displayName: "Current Customer", serviceStreet: "1 Main", serviceState: "MA", serviceZip: "01752" },
    reports: [report], technician: { id: "tech", userSub: "caller", active: true, name: "Technician" },
    catalog: [{ id: "product", name: "Approved product", active: true, labelApproved: true, epaNumber: "123", defaultRate: "1", reEntryHours: 0 }],
    priorVisits: [recent], lineage: [], historyAllowed: true, packetChanged: true, ...overrides };
}
function current(overrides: Record<string, unknown> = {}) {
  const { catalog: _catalog, priorVisits: _prior, lineage: _lineage, ...rest } = fixture();
  return { ...rest, currentOnly: true, ...overrides };
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
let root: Root, container: HTMLDivElement, navigate: ReturnType<typeof useNavigate>;
let savedStorage: Map<string, string>;
function Probe() { navigate = useNavigate(); return null; }
function button(label: string) {
  const element = [...container.querySelectorAll("button")].find((node) => node.textContent?.trim() === label);
  if (!element) throw new Error(`Missing button ${label}`); return element;
}
async function mount() { await act(async () => root.render(createElement(MemoryRouter, { initialEntries: ["/tech/job/job"] }, createElement(Probe),
  createElement(Routes, null, createElement(Route, { path: "/tech/job/:jobId", element: createElement(TechJob) }))))); }
async function type(value: string) { await act(async () => {
  const textarea = container.querySelector("textarea")!;
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(textarea, value);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}); }
beforeEach(() => {
  vi.clearAllMocks(); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); mocks.order.length = 0;
  queryCache.activate("caller", ["TECH"]);
  HTMLElement.prototype.scrollIntoView = vi.fn();
  savedStorage = new Map();
  vi.stubGlobal("localStorage", { getItem: (key: string) => savedStorage.get(key) ?? null, setItem: (key: string, value: string) => savedStorage.set(key, value), removeItem: (key: string) => savedStorage.delete(key), clear: () => savedStorage.clear(), key: (index: number) => [...savedStorage.keys()][index] ?? null, get length() { return savedStorage.size; } });
  mocks.full.mockResolvedValue(fixture()); mocks.current.mockResolvedValue(current());
  mocks.history.mockResolvedValue({ historyPage: true, historyAllowed: true, priorVisits: [], historyNextToken: null });
  mocks.save.mockImplementation(async () => { mocks.order.push("save"); return { data: JSON.stringify({ reportId: "draft" }) }; });
  mocks.end.mockImplementation(async () => { mocks.order.push("end"); return { data: JSON.stringify({ applicationEndAt: "server stamp" }) }; });
  mocks.finalize.mockImplementation(async () => { mocks.order.push("finalize"); return { data: JSON.stringify({ reportId: "draft" }) }; });
  mocks.acknowledge.mockResolvedValue({ data: "{}" });
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); queryCache.activate(null); vi.unstubAllGlobals(); });

it("preserves newer unsaved typing and loaded context through a thin post-save refresh", async () => {
  const saved = deferred<{ data: string }>(); mocks.save.mockReturnValue(saved.promise);
  await mount(); await type("Words sent to office");
  await act(async () => button("Save draft").click());
  await type("Newer unsaved typing");
  await act(async () => saved.resolve({ data: JSON.stringify({ reportId: "draft" }) }));
  expect(mocks.full).toHaveBeenCalledOnce(); expect(mocks.current).toHaveBeenCalledWith("job", "draft");
  expect(container.querySelector("textarea")!.value).toBe("Newer unsaved typing");
  expect(container.textContent).toContain("Previous treatment");
  expect([...savedStorage.values()].join(" ")).toContain("Newer unsaved typing");
});
it("keeps save, end-application, finalize, then confirmed-report refresh in that order", async () => {
  mocks.current.mockImplementation(async () => { mocks.order.push("refresh"); return current({ reports: [{ ...report, status: "FINALIZED" }] }); });
  await mount(); await act(async () => button("Complete & send").click());
  expect(mocks.order).toEqual(["save", "end", "finalize", "refresh"]);
  expect(mocks.current).toHaveBeenCalledWith("job", "draft"); expect(mocks.full).toHaveBeenCalledOnce();
});
it("does not end or finalize while draft save is unresolved, and a refusal preserves typing", async () => {
  const saved = deferred<{ data: string }>(); mocks.save.mockReturnValue(saved.promise);
  await mount(); await type("Keep this report"); await act(async () => button("Complete & send").click());
  expect(mocks.end).not.toHaveBeenCalled(); expect(mocks.finalize).not.toHaveBeenCalled();
  await act(async () => saved.resolve({ data: JSON.stringify({ refused: "Cannot edit this report" }) }));
  expect(container.querySelector("textarea")!.value).toBe("Keep this report"); expect(mocks.end).not.toHaveBeenCalled();
  expect([...savedStorage.values()].join(" ")).toContain("Keep this report");
});
it("keeps the phone draft on finalize refusal and never refreshes as though the report was sent", async () => {
  mocks.finalize.mockResolvedValue({ data: JSON.stringify({ refused: "Review the application fields" }) });
  await mount(); await type("Unsaved legal record"); await act(async () => button("Complete & send").click());
  expect(mocks.order).toEqual(["save", "end"]);
  expect(mocks.current).not.toHaveBeenCalled();
  expect(container.querySelector("textarea")!.value).toBe("Unsaved legal record");
  expect([...savedStorage.values()].join(" ")).toContain("Unsaved legal record");
});
it("clears an old customer's finalized report/PDF if CURRENT changes context and report verification fails", async () => {
  mocks.full.mockResolvedValue(fixture({ job: { ...job, status: "COMPLETED" }, reports: [{ ...report, status: "FINALIZED", pdfKey: "old-customer-pdf" }] }));
  mocks.current.mockResolvedValue(current({ job: { ...job, customerId: "new", status: "COMPLETED" }, customer: { id: "new", displayName: "New Customer" }, reports: [], reportsUnavailable: true }));
  await mount(); expect(container.querySelector('[data-document="old-customer-pdf"]')).not.toBeNull();
  await act(async () => button("I've read the change — acknowledge").click());
  expect(container.querySelector('[data-document="old-customer-pdf"]')).toBeNull(); expect(container.textContent).toContain("New Customer");
  expect(container.textContent).not.toContain("Previous treatment");
});
it("recovers findings in both recent context and full history while deduplicating the initial context", async () => {
  mocks.history.mockResolvedValue({ historyPage: true, historyAllowed: true, priorVisits: [{ ...recent, findingsUnavailable: false, findings: { servicesPerformed: "Recovered application details" } }], historyNextToken: "more" });
  await mount(); expect(container.textContent).toContain("Treatment findings unavailable");
  await act(async () => button("Open visit history").click());
  expect(container.textContent).not.toContain("Treatment findings unavailable");
  expect(container.textContent!.match(/Recovered application details/g)).toHaveLength(2);
  expect(container.textContent!.match(/Previous treatment/g)).toHaveLength(2);
});
it("ignores an old history completion after CURRENT removes history permission", async () => {
  const page = deferred<unknown>(); mocks.history.mockReturnValue(page.promise);
  mocks.current.mockResolvedValue(current({ job: { ...job, status: "COMPLETED" }, reports: [{ ...report, status: "FINALIZED" }], historyAllowed: false }));
  await mount(); await act(async () => button("Open visit history").click());
  await act(async () => button("I've read the change — acknowledge").click());
  await act(async () => page.resolve({ historyPage: true, historyAllowed: true, priorVisits: [{ id: "private", serviceType: "No longer allowed" }], historyNextToken: null }));
  expect(container.textContent).not.toContain("No longer allowed"); expect(container.textContent).not.toContain("Previous treatment");
  expect(container.textContent).not.toContain("Open visit history");
});
it("rejects late job-detail completions after navigating to another job", async () => {
  const old = deferred<unknown>(); mocks.full.mockReturnValueOnce(old.promise).mockResolvedValueOnce(fixture({ job: { ...job, id: "other", customerId: "other" }, customer: { id: "other", displayName: "Other Customer" } }));
  await mount(); await act(async () => navigate("/tech/job/other"));
  await act(async () => old.resolve(fixture()));
  expect(container.textContent).toContain("Other Customer"); expect(container.textContent).not.toContain("Current Customer");
});
it("rejects a late CURRENT result across same-sub logout/login using the auth scope epoch", async () => {
  const old = deferred<unknown>(); mocks.current.mockReturnValue(old.promise);
  mocks.full.mockResolvedValueOnce(fixture()).mockResolvedValueOnce(fixture({ customer: { id: "customer", displayName: "Fresh signed-in context" } }));
  await mount(); await act(async () => button("I've read the change — acknowledge").click());
  await act(async () => { queryCache.activate(null); queryCache.activate("caller", ["TECH"]); });
  await act(async () => old.resolve(current({ customer: { id: "customer", displayName: "Stale previous login" } })));
  expect(container.textContent).toContain("Fresh signed-in context"); expect(container.textContent).not.toContain("Stale previous login");
});
it("rejects old HISTORY completion across same-sub logout/login", async () => {
  const old = deferred<unknown>(); mocks.history.mockReturnValue(old.promise);
  await mount(); await act(async () => button("Open visit history").click());
  await act(async () => { queryCache.activate(null); queryCache.activate("caller", ["TECH"]); });
  await act(async () => old.resolve({ historyPage: true, historyAllowed: true, priorVisits: [{ id: "old", serviceType: "Old login history" }], historyNextToken: null }));
  expect(container.textContent).not.toContain("Old login history");
});
it("an old-login draft save cannot continue finalization or clear a new-login phone draft", async () => {
  const saved = deferred<{ data: string }>(); mocks.save.mockReturnValue(saved.promise);
  await mount(); await type("Prior login words"); await act(async () => button("Complete & send").click());
  await act(async () => { queryCache.activate(null); queryCache.activate("caller", ["TECH"]); });
  await type("New login unsaved words");
  await act(async () => saved.resolve({ data: JSON.stringify({ reportId: "draft" }) }));
  expect(mocks.end).not.toHaveBeenCalled(); expect(mocks.finalize).not.toHaveBeenCalled(); expect(mocks.current).not.toHaveBeenCalled();
  expect(container.querySelector("textarea")!.value).toBe("New login unsaved words");
  expect([...savedStorage.values()].join(" ")).toContain("New login unsaved words");
});
it("waits for a successful first report read, then edits the recovered draft's fields and ID", async () => {
  const recovered = { ...report, id: "existing-draft", servicesPerformed: "Recovered server words" };
  mocks.full.mockResolvedValue(fixture({ reports: [], reportsUnavailable: true }));
  mocks.current.mockResolvedValue(current({ reports: [recovered] }));
  mocks.save.mockResolvedValue({ data: JSON.stringify({ reportId: recovered.id }) });
  await mount();
  expect(container.querySelector("textarea")).toBeNull();
  expect([...container.querySelectorAll("button")].some((node) => node.textContent?.trim() === "Save draft")).toBe(false);
  await act(async () => button("Retry job refresh").click());
  expect(container.querySelector("textarea")!.value).toBe("Recovered server words");
  await act(async () => button("Save draft").click());
  expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ reportId: "existing-draft", servicesPerformed: "Recovered server words" }));
});
it("preserves an already mounted editor and its unsaved typing through a later unavailable report read", async () => {
  mocks.current.mockResolvedValueOnce(current({ reports: [], reportsUnavailable: true })).mockResolvedValue(current());
  await mount(); await type("Keep this mounted editor");
  const editor = container.querySelector("textarea");
  await act(async () => button("I've read the change — acknowledge").click());
  expect(container.querySelector("textarea")).toBe(editor);
  expect(container.querySelector("textarea")!.value).toBe("Keep this mounted editor");
  await act(async () => button("Retry job refresh").click());
  expect(container.querySelector("textarea")).toBe(editor);
  await act(async () => button("Save draft").click());
  expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ reportId: "draft", servicesPerformed: "Keep this mounted editor" }));
});
it("retries unavailable final-page findings without erasing loaded history or restarting pagination", async () => {
  const first = { id: "first-page", status: "CANCELED", serviceType: "Keep earlier loaded visit", scheduledDate: "2026-09-01" };
  const last = { ...recent, id: "final-page", serviceType: "Final page treatment" };
  mocks.full.mockResolvedValue(fixture({ priorVisits: [] }));
  mocks.history.mockResolvedValueOnce({ historyPage: true, historyAllowed: true, priorVisits: [first], historyNextToken: "final-token" })
    .mockResolvedValueOnce({ historyPage: true, historyAllowed: true, priorVisits: [last], historyNextToken: null })
    .mockResolvedValueOnce({ historyPage: true, historyAllowed: true, priorVisits: [{ ...last, findingsUnavailable: false, findings: { servicesPerformed: "Recovered final-page findings" } }], historyNextToken: null });
  await mount(); await act(async () => button("Open visit history").click());
  await act(async () => button("Load more visits").click());
  expect(container.textContent).toContain("Treatment findings unavailable");
  expect([...container.querySelectorAll("button")].some((node) => node.textContent?.trim() === "Load more visits")).toBe(false);
  await act(async () => button("Retry treatment findings").click());
  expect(mocks.history.mock.calls).toEqual([["job", undefined], ["job", "final-token"], ["job", "final-token"]]);
  expect(container.textContent).toContain("Keep earlier loaded visit"); expect(container.textContent).toContain("Recovered final-page findings");
  expect(container.textContent).not.toContain("Treatment findings unavailable");
  expect([...container.querySelectorAll("button")].some((node) => node.textContent?.trim() === "Retry treatment findings")).toBe(false);
});
