// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Dashboard from "./Dashboard";

const mocks = vi.hoisted(() => ({
  invoices: vi.fn(),
  disputes: vi.fn(),
  assign: vi.fn(),
}));

vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));
vi.mock("../lib/auth", () => ({ useRoles: () => ({ sub: "staff-1" }) }));
vi.mock("../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api")>();
  const emptyList = async () => ({ data: [], nextToken: null });
  return {
    ...actual,
    assignRecoveryOwner: mocks.assign,
    listDisputes: mocks.disputes,
    api: () => ({
      models: {
        Invoice: { list: mocks.invoices },
        Customer: { list: emptyList },
        ServicePlan: { list: emptyList },
        Job: { list: emptyList },
        BookingRequest: { list: emptyList },
      },
    }),
  };
});

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Unexpected network request"); }));
  mocks.invoices.mockReset().mockResolvedValue({ data: [], nextToken: null });
  mocks.disputes.mockReset().mockResolvedValue({ data: [], nextToken: null });
  mocks.assign.mockReset().mockResolvedValue({ data: { ownerSub: "staff-1" } });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function assignButton(): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll("button"))
    .find((candidate) => candidate.textContent === "Assign to me");
  expect(button).toBeDefined();
  return button!;
}

describe("recovery ownership", () => {
  it.each(["INVOICE", "DISPUTE"])("shows a failed %s assignment and allows a successful retry", async (kind) => {
    const row = {
      id: "recovery-1",
      customerId: "customer-1",
      amountCents: 12000,
      status: kind === "INVOICE" ? "FAILED" : "NEEDS_RESPONSE",
    };
    const list = kind === "INVOICE" ? mocks.invoices : mocks.disputes;
    list.mockResolvedValue({ data: [row], nextToken: null });
    mocks.assign.mockResolvedValueOnce({
      data: null,
      errors: [{ message: "Could not assign the owner" }],
    });
    await act(async () => root.render(createElement(Dashboard)));
    await act(async () => assignButton().click());

    expect(mocks.assign).toHaveBeenCalledWith({ kind, id: "recovery-1" });
    expect(container.querySelector('[role="alert"]')?.textContent).toBe("Could not assign the owner");
    expect(container.textContent).toContain("Unassigned");
    expect(assignButton().disabled).toBe(false);
    expect(list).toHaveBeenCalledTimes(1);

    list.mockResolvedValue({ data: [{ ...row, ownerSub: "staff-1" }], nextToken: null });
    await act(async () => assignButton().click());

    expect(mocks.assign).toHaveBeenCalledTimes(2);
    expect(list).toHaveBeenCalledTimes(2);
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.textContent).toContain("Owner: you");
    expect(container.textContent).not.toContain("Assign to me");
  });
});
