// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CustomerDetail from "./CustomerDetail";

const mocks = vi.hoisted(() => ({
  createOfficeJob: vi.fn(),
  updateCustomerContact: vi.fn(),
  customerGet: vi.fn(),
  navigate: vi.fn(),
  location: { pathname: "/customers/lead-123", state: null },
  lead: {
    id: "lead-123", displayName: "Manual job lead", status: "LEAD",
    serviceStreet: "12 Elm Street", serviceCity: "Providence", serviceState: "RI",
    serviceZip: "02903", propertyClass: "RESIDENTIAL", createdAt: "2026-10-05T13:00:00Z",
  },
}));

vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "lead-123" }),
  useNavigate: () => mocks.navigate,
  useLocation: () => mocks.location,
}));
vi.mock("../lib/auth", () => ({
  useRoles: () => ({ owner: true, office: true, finance: true, loading: false, groups: [] }),
}));
vi.mock("../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api")>();
  const list = async () => ({ data: [], nextToken: null });
  const models = Object.fromEntries([
    "ServicePlan", "Job", "Agreement", "ServiceReport", "ServiceReportAmendment", "Invoice", "CustomerGroup",
  ].map((name) => [name, { list }]));
  return {
    ...actual,
    api: () => ({
      models: { ...models, Customer: { get: mocks.customerGet }, BookingRequest: { listBookingRequestByLeadCustomerId: list } },
      queries: { getPaymentMethodSummary: async () => ({ data: JSON.stringify({ hasPaymentMethod: false, label: null }) }) },
      mutations: { createOfficeJob: mocks.createOfficeJob, updateCustomerContact: mocks.updateCustomerContact },
    }),
    listCustomerLifecycleEvents: async () => ({ data: [], readFailed: false }),
    listLifecycleCommands: async () => [],
    listLeadActivity: list,
  };
});

let container: HTMLDivElement;
let root: Root;

function button(text: string, scope: ParentNode = container): HTMLButtonElement {
  const result = Array.from(scope.querySelectorAll("button")).find((b) => b.textContent?.trim() === text);
  if (!result) throw new Error(`Missing button: ${text}`);
  return result;
}

function field(label: string): HTMLInputElement | HTMLSelectElement {
  const dialog = container.querySelector('[role="dialog"]')!;
  const wrapper = Array.from(dialog.querySelectorAll(".field")).find((node) => node.querySelector(".field-label")?.textContent === label);
  const control = wrapper?.querySelector<HTMLInputElement | HTMLSelectElement>("input, select");
  if (!control) throw new Error(`Missing field: ${label}`);
  return control;
}

async function setField(label: string, value: string) {
  await act(async () => {
    const control = field(label);
    const proto = control instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(control, value);
    control.dispatchEvent(new Event(control instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
  });
}

async function openJob() {
  await act(async () => root.render(createElement(CustomerDetail)));
  expect(container.textContent).toContain("Handle this inquiry");
  expect(container.querySelector('[role="dialog"]')).toBeNull();
  await act(async () => button("Add job").click());
  expect(container.querySelector('[role="dialog"]')?.textContent).toContain("Job amount ($)");
}

async function fillJob() {
  await setField("Service", "WASP_NEST");
  await setField("Job amount ($)", "325.50");
  await setField("Date", "2026-10-06");
  await setField("Start time", "15:30");
  await setField("End time", "16:30");
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Unexpected network request"); }));
  mocks.customerGet.mockReset().mockResolvedValue({ data: mocks.lead });
  mocks.updateCustomerContact.mockReset().mockResolvedValue({ data: JSON.stringify({ customerId: "lead-123" }) });
  mocks.createOfficeJob.mockReset().mockResolvedValue({ data: JSON.stringify({ jobId: "job-123" }) });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("manual lead job form", () => {
  it("opens from a lead and sends its appointment and agreed amount", async () => {
    await openJob();
    await fillJob();
    await act(async () => button("Create job").click());
    expect(mocks.createOfficeJob).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      customerId: "lead-123", serviceCode: "WASP_NEST", priceCents: 32550,
      scheduledDate: "2026-10-06", scheduledStartTime: "15:30", scheduledEndTime: "16:30",
      propertyClass: "RESIDENTIAL",
    }));
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(container.textContent).toContain("Job added.");
    expect(mocks.customerGet).toHaveBeenCalledTimes(2);
  });

  it("preserves the values and shows a server refusal instead of reporting success", async () => {
    mocks.createOfficeJob.mockResolvedValue({ data: JSON.stringify({ refused: "The service address must be completed." }) });
    await openJob();
    await fillJob();
    await act(async () => button("Create job").click());
    expect(mocks.createOfficeJob).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain("The service address must be completed.");
    expect(field("Job amount ($)").value).toBe("325.50");
    expect(field("Start time").value).toBe("15:30");
    expect(container.textContent).not.toContain("Job added.");
    expect(mocks.customerGet).toHaveBeenCalledTimes(1);
  });

  it("requires the lead amount and rejects reversed appointment windows before submission", async () => {
    await openJob();
    await act(async () => button("Create job").click());
    expect(mocks.createOfficeJob).not.toHaveBeenCalled();
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain("Enter the agreed job amount");
    await fillJob();
    await setField("End time", "15:00");
    await act(async () => button("Create job").click());
    expect(mocks.createOfficeJob).not.toHaveBeenCalled();
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain("End time must be after start time");
  });
});



describe("manual job lead settlement", () => {
  it("explains conversion and reloads the client after creating the job", async () => {
    await openJob();
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain("Creating a job for an open lead turns it into an active client and closes sales follow-ups");
    await fillJob();
    mocks.customerGet.mockResolvedValue({ data: { ...mocks.lead, status: "ACTIVE" } });
    await act(async () => button("Create job").click());
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(container.textContent).not.toContain("Handle this inquiry");
    expect(container.textContent).toContain("Payment method");
    expect(mocks.createOfficeJob).toHaveBeenCalledTimes(1);
  });

  it("closes the form and preserves a recovery warning when a saved job needs lead follow-up repair", async () => {
    const warning = "Job saved, but the lead follow-up could not be closed. Do not add the job again. Recovery work was recorded.";
    mocks.createOfficeJob.mockResolvedValue({ data: JSON.stringify({ jobId: "job-123", warning }) });
    await openJob();
    await fillJob();
    await act(async () => button("Create job").click());
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(container.querySelector('.attention-note[role="alert"]')?.textContent).toContain(warning);
    expect(container.textContent).toContain("Job added.");
    expect(container.textContent).not.toContain("Could not create job");
    expect(mocks.createOfficeJob).toHaveBeenCalledTimes(1);
    expect(mocks.customerGet).toHaveBeenCalledTimes(2);
  });
});
