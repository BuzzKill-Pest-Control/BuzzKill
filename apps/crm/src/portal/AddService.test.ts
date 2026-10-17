// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import PortalAddService from "./AddService";

const mocks = vi.hoisted(() => ({
  mutation: vi.fn(),
  roles: { loading: false, groups: ["cus-test-customer"] },
}));

vi.mock("../lib/auth", () => ({ useRoles: () => mocks.roles }));
vi.mock("./portalData", () => ({
  loadMyCustomers: async () => [{ id: "test-customer", displayName: "Test customer", serviceStreet: "12 Test St" }],
}));
vi.mock("../lib/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("../lib/api")>(),
  api: () => ({ mutations: { createSetupIntent: mocks.mutation } }),
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Unexpected network request"); }));
  mocks.mutation.mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function showQuote(planOnly: boolean, dayFee?: number) {
  mocks.mutation.mockResolvedValue({ data: {
    decision: "PRICED",
    bookingId: "test-booking",
    planOnly,
    days: [
      { date: "2026-10-20", priceCents: 36000, planInitialFeeCents: dayFee },
      { date: "2026-10-21", priceCents: 38000, planInitialFeeCents: 11900 },
    ],
    recurringOffer: { frequency: "MONTHLY", monthlyCents: 5900, initialFeeCents: 14900 },
  } });
  await act(async () => root.render(createElement(MemoryRouter, null, createElement(PortalAddService))));
  await clickButton("Get my price");
  expect(mocks.mutation).toHaveBeenCalledWith(expect.objectContaining({ action: "ADD_SERVICE_QUOTE" }));
}

async function clickButton(text: string) {
  const button = [...container.querySelectorAll("button")].find((b) => b.textContent === text);
  expect(button).toBeDefined();
  await act(async () => button!.click());
}

async function selectDay(date: string) {
  const select = [...container.querySelectorAll("select")].find((s) =>
    [...s.options].some((o) => o.value === date)
  )!;
  await act(async () => {
    select.value = date;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

it("shows the selected day's first-visit fee for a plan-only quote", async () => {
  await showQuote(true, 9700);
  expect(container.textContent).toContain("$97 today, then $59/mo");
  await selectDay("2026-10-21");
  expect(container.textContent).toContain("$119 today, then $59/mo");
});

it("uses the selected day's fee when switching from one-time to a plan", async () => {
  await showQuote(false, 9700);
  expect(container.textContent).toContain("$360 one-time");
  await clickButton("$59/mo plan");
  expect(container.textContent).toContain("$97 today, then $59/mo");
  await selectDay("2026-10-21");
  expect(container.textContent).toContain("$119 today, then $59/mo");
  await clickButton("One-time");
  expect(container.textContent).toContain("$380 one-time");
});

it("falls back to the offer fee for an older quote without per-day plan fees", async () => {
  await showQuote(true);
  expect(container.textContent).toContain("$149 today, then $59/mo");
});
