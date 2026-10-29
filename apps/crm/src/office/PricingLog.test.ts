// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PricingLog from "./PricingLog";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  update: vi.fn(),
  row: {
    id: "pricing-run-1",
    town: "Test town",
    service: "General pest control",
    decision: "QUOTE",
    outcome: "PENDING",
  },
}));

vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));
vi.mock("../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api")>();
  return {
    ...actual,
    api: () => ({ models: { LeadPricingRun: { list: mocks.list, update: mocks.update } } }),
  };
});

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Unexpected network request"); }));
  mocks.list.mockReset().mockResolvedValue({ data: [mocks.row], nextToken: null });
  mocks.update.mockReset().mockResolvedValue({ data: { ...mocks.row, outcome: "WON" } });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function button(label: string): HTMLButtonElement {
  const found = Array.from(container.querySelectorAll("button"))
    .find((candidate) => candidate.textContent === label);
  expect(found).toBeDefined();
  return found!;
}

async function chooseOutcome() {
  await act(async () => root.render(createElement(PricingLog)));
  const row = container.querySelector<HTMLElement>('[role="button"]');
  expect(row?.textContent).toContain("Test town");
  await act(async () => row!.click());
  await act(async () => button("Won").click());
}

describe("pricing outcome saves", () => {
  it.each(["GraphQL", "request"])("prevents dismissal during a pending save and keeps a later %s failure visible", async (failure) => {
    let resolveSave!: (result: unknown) => void;
    let rejectSave!: (error: Error) => void;
    mocks.update.mockImplementationOnce(() => new Promise((resolve, reject) => {
      resolveSave = resolve;
      rejectSave = reject;
    }));
    await chooseOutcome();
    expect(container.querySelector('[aria-label="Close"]')).not.toBeNull();
    await act(async () => button("Save outcome").click());
    expect(button("Save outcome").disabled).toBe(true);

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();

    const backdrop = container.querySelector<HTMLElement>(".sheet-backdrop");
    expect(backdrop).not.toBeNull();
    await act(async () => backdrop!.click());
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Close"]')).toBeNull();

    await act(async () => {
      if (failure === "GraphQL") {
        resolveSave({ data: null, errors: [{ message: "Outcome was not saved" }] });
      } else {
        rejectSave(new Error("Outcome was not saved"));
      }
    });
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.querySelector('[role="alert"]')?.textContent).toBe("Outcome was not saved");
    expect(button("Won").classList.contains("seg-on")).toBe(true);
    expect(button("Save outcome").disabled).toBe(false);
    expect(mocks.list).toHaveBeenCalledTimes(1);

    const close = container.querySelector<HTMLButtonElement>('[aria-label="Close"]');
    expect(close).not.toBeNull();
    await act(async () => close!.click());
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it.each(["GraphQL", "request"])("keeps the chosen outcome and shows a %s failure in the editor, then allows retry", async (failure) => {
    if (failure === "GraphQL") {
      mocks.update.mockResolvedValueOnce({ data: null, errors: [{ message: "Outcome was not saved" }] });
    } else {
      mocks.update.mockRejectedValueOnce(new Error("Outcome was not saved"));
    }
    await chooseOutcome();
    await act(async () => button("Save outcome").click());

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.querySelector('[role="alert"]')?.textContent).toBe("Outcome was not saved");
    expect(button("Won").classList.contains("seg-on")).toBe(true);
    expect(button("Save outcome").disabled).toBe(false);
    expect(mocks.list).toHaveBeenCalledTimes(1);

    await act(async () => button("Save outcome").click());
    expect(mocks.update).toHaveBeenLastCalledWith({ id: "pricing-run-1", outcome: "WON" });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(mocks.list).toHaveBeenCalledTimes(2);
  });

  it("closes the editor and refreshes the log after a successful save", async () => {
    await chooseOutcome();
    await act(async () => button("Save outcome").click());
    expect(mocks.update).toHaveBeenCalledWith({ id: "pricing-run-1", outcome: "WON" });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(mocks.list).toHaveBeenCalledTimes(2);
  });
});
