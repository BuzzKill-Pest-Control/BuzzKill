// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Schedule from "./Schedule";

const mocks = vi.hoisted(() => ({
  facts: vi.fn(), closure: vi.fn(), exceptions: vi.fn(),
  close: vi.fn(), reopen: vi.fn(), addPto: vi.fn(), removePto: vi.fn(),
}));

vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));
vi.mock("../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api")>();
  const emptyList = async () => ({ data: [], nextToken: null });
  return {
    ...actual,
    api: () => ({
      queries: { capacityDayFacts: mocks.facts },
      models: {
        Technician: { list: async () => ({ data: [{ id: "tech-1", name: "Test technician", active: true }] }) },
        Route: { listRouteByDate: emptyList },
        Job: { list: emptyList, listJobByScheduledDate: emptyList },
        Customer: { list: emptyList },
        CompanyClosure: { get: mocks.closure, create: mocks.close, delete: mocks.reopen },
        TechnicianDayException: {
          listTechnicianDayExceptionByDate: mocks.exceptions,
          create: mocks.addPto, delete: mocks.removePto,
        },
      },
    }),
  };
});

const closure = { id: "2026-10-27", date: "2026-10-27", reason: "Company holiday" };
const pto = { id: "pto-1", technicianId: "tech-1", date: "2026-10-27", kind: "PTO", reason: "Vacation" };
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-27T14:00:00Z"));
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Unexpected network request"); }));
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.facts.mockResolvedValue({ data: JSON.stringify({
    eligibleTechs: 1, technicians: [], poolMinutes: 0,
    liveCheckoutClaims: 0, sellable: true, reasons: [],
  }) });
  mocks.closure.mockResolvedValue({ data: null });
  mocks.exceptions.mockResolvedValue({ data: [] });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function button(label: string) {
  const found = [...container.querySelectorAll("button")].find((el) => el.textContent === label);
  expect(found).toBeDefined();
  return found!;
}

async function click(label: string) {
  await act(async () => button(label).click());
}

async function enterReason(placeholder: string, value: string) {
  const input = container.querySelector<HTMLInputElement>(`input[placeholder="${placeholder}"]`)!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

it.each([
  ["close", "Confirm company closure"],
  ["reopen", "Reopen this day"],
  ["addPto", "Save PTO"],
  ["removePto", "Remove"],
] as const)("shows a rejected %s action and allows a successful retry", async (operation, label) => {
  if (operation === "reopen") mocks.closure.mockResolvedValue({ data: closure });
  if (operation === "removePto") mocks.exceptions.mockResolvedValue({ data: [pto] });
  const mutation = mocks[operation];
  mutation.mockResolvedValueOnce({ data: null, errors: [{ message: "Schedule change was denied" }] });

  await act(async () => root.render(createElement(Schedule)));
  await act(async () => container.querySelector<HTMLButtonElement>(".sched-capacity-toggle")!.click());
  if (operation === "close") {
    await click("Close this day");
    await enterReason("Example: Company holiday", closure.reason);
  } else if (operation === "addPto") {
    await click("+ Add PTO");
    await act(async () => {
      const select = container.querySelector<HTMLSelectElement>(".availability-pto-fields select")!;
      select.value = pto.technicianId;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await enterReason("Example: Vacation", pto.reason);
  }
  await click(label);

  const input = operation === "close" ? closure
    : operation === "reopen" ? { id: closure.id }
    : operation === "addPto" ? { technicianId: pto.technicianId, date: pto.date, kind: pto.kind, reason: pto.reason }
    : { id: pto.id };
  expect(mutation).toHaveBeenCalledExactlyOnceWith(input);
  expect(container.querySelector('[role="alert"]')?.textContent).toBe("Schedule change was denied");
  expect(mocks.facts).toHaveBeenCalledTimes(1);
  expect(button(label).disabled).toBe(false);
  if (operation === "close" || operation === "addPto") {
    expect(container.querySelector<HTMLInputElement>(".availability-action-form input")?.value)
      .toBe(operation === "close" ? closure.reason : pto.reason);
  }

  mutation.mockResolvedValueOnce({ data: operation === "close" || operation === "reopen" ? closure : pto });
  mocks.closure.mockResolvedValue({ data: operation === "close" ? closure : null });
  mocks.exceptions.mockResolvedValue({ data: operation === "addPto" ? [pto] : [] });
  await click(label);

  expect(mutation).toHaveBeenCalledTimes(2);
  expect(mutation).toHaveBeenLastCalledWith(input);
  expect(mocks.facts).toHaveBeenCalledTimes(2);
  expect(container.querySelector('[role="alert"]')).toBeNull();
  expect(container.querySelector(".availability-action-form")).toBeNull();
  expect(container.textContent).toContain(operation === "close" ? closure.reason
    : operation === "reopen" ? "No company closure is recorded."
    : operation === "addPto" ? pto.reason : "No technician PTO recorded.");
});
