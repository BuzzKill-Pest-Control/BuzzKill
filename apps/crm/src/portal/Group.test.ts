// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PortalGroup from "./Group";

const mocks = vi.hoisted(() => ({
  jobs: vi.fn(),
  roles: { loading: false, groups: ["grp-group-1"] },
  customer: { id: "customer-1", displayName: "Test property", status: "ACTIVE" },
}));

vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));
vi.mock("../lib/auth", () => ({
  useRoles: () => mocks.roles,
  myGroupIds: () => ["group-1"],
}));
vi.mock("../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api")>();
  return {
    ...actual,
    api: () => ({
      models: {
        CustomerGroup: { get: async () => ({ data: { id: "group-1", name: "Test group" } }) },
        Customer: { list: async () => ({ data: [mocks.customer], nextToken: null }) },
        Job: { list: mocks.jobs },
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
  mocks.jobs.mockReset().mockResolvedValue({ data: [], nextToken: null });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function openProperty() {
  await act(async () => root.render(createElement(PortalGroup)));
  const property = container.querySelector<HTMLElement>('[role="button"]');
  expect(property?.textContent).toContain("Test property");
  await act(async () => property!.click());
  expect(mocks.jobs).toHaveBeenCalledWith(expect.objectContaining({
    filter: { customerId: { eq: "customer-1" } },
  }));
  return container.querySelector<HTMLElement>('[role="dialog"]')!;
}

describe("group property visits", () => {
  it.each(["request failure", "GraphQL failure"])("shows a %s instead of claiming there are no visits", async (failure) => {
    if (failure === "request failure") {
      mocks.jobs.mockRejectedValue(new Error("Visits unavailable"));
    } else {
      mocks.jobs.mockResolvedValue({ data: [], errors: [{ message: "Visits unavailable" }] });
    }
    const detail = await openProperty();
    expect(detail.textContent).not.toContain("Nothing scheduled.");
    expect(detail.textContent).not.toContain("None yet.");
    expect(detail.querySelector('[role="alert"]')?.textContent).toBe("Visits unavailable");
    expect(detail.querySelector('[role="status"]')).toBeNull();
  });

  it("shows empty states after a successful empty read", async () => {
    const detail = await openProperty();
    expect(detail.textContent).toContain("Nothing scheduled.");
    expect(detail.textContent).toContain("None yet.");
    expect(detail.querySelector('[role="alert"]')).toBeNull();
  });

  it("shows upcoming and completed visits from a successful read", async () => {
    mocks.jobs.mockResolvedValue({ data: [
      { id: "upcoming", status: "SCHEDULED", scheduledDate: "2099-10-06", serviceType: "Upcoming pest visit" },
      { id: "completed", status: "COMPLETED", scheduledDate: "2026-10-01", serviceType: "Completed pest visit" },
    ], nextToken: null });
    const detail = await openProperty();
    expect(detail.textContent).toContain("Upcoming pest visit");
    expect(detail.textContent).toContain("Completed pest visit");
    expect(detail.querySelector('[role="alert"]')).toBeNull();
  });
});
