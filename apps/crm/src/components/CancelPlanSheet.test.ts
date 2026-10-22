// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { PlanCancellationPreview } from "../lib/api";
import { pendingCancelMessage } from "../../../web/amplify/functions/shared/planCancellationPolicy";
import CancelPlanSheet from "./CancelPlanSheet";

const mocks = vi.hoisted(() => ({ preview: vi.fn(), cancel: vi.fn(), close: vi.fn(), canceled: vi.fn() }));
vi.mock("../lib/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("../lib/api")>(),
  previewPlanCancellation: mocks.preview,
  cancelPlanByCustomer: mocks.cancel,
}));

const preview: PlanCancellationPreview = {
  servicePlanId: "plan-1", planName: "General pest protection", priceCents: 7200,
  serviceFrequency: "MONTHLY", status: "ACTIVE", alreadyResolved: false,
  cancellationPending: false, effectiveDate: "2026-10-22",
  finalCharge: { amountCents: 0, description: "No new charge." },
  refundOutcome: { amountCents: 0, description: "The current period is not refunded." },
  queuedVisits: [], visitsStopping: 0, paidVisitRemains: false,
  outstandingBalanceCents: 0, coverageEnding: "Coverage ends when the plan is canceled.",
  saveOfferAvailable: true, pendingMessage: pendingCancelMessage(),
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Unexpected network request"); }));
  mocks.preview.mockReset();
  mocks.cancel.mockReset();
  mocks.close.mockReset();
  mocks.canceled.mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function render(data: PlanCancellationPreview) {
  mocks.preview.mockResolvedValue({ data });
  await act(async () => root.render(createElement(CancelPlanSheet, {
    servicePlanId: data.servicePlanId, open: true,
    onClose: mocks.close, onCanceled: mocks.canceled,
  })));
}

function button(label: string) {
  return Array.from(container.querySelectorAll("button")).find((el) => el.textContent === label);
}

it("shows an already pending cancellation from the current preview without asking for another cancellation", async () => {
  // The plan list can predate a cancellation started in another session.
  await render({ ...preview, cancellationPending: true });

  expect(container.querySelector('[role="status"]')?.textContent).toContain(preview.pendingMessage);
  expect(container.textContent).not.toContain("billing and visits stop right away");
  expect(container.textContent).not.toContain("This plan is already canceled");
  expect(button("Cancel my plan")).toBeUndefined();
  expect(button("No thanks, continue canceling")).toBeUndefined();
  expect(mocks.cancel).not.toHaveBeenCalled();
  expect(mocks.canceled).not.toHaveBeenCalled();
  await act(async () => button("Close")!.click());
  expect(mocks.close).toHaveBeenCalledOnce();
});

it("still offers cancellation for an active plan and shows the returned pending outcome", async () => {
  mocks.cancel.mockResolvedValue({ data: {
    status: "PENDING", message: preview.pendingMessage, requestedAt: "2026-10-22T12:00:00Z",
  } });
  await render(preview);
  expect(button("Cancel my plan")).toBeDefined();
  await act(async () => button("Cancel my plan")!.click());

  expect(mocks.cancel).toHaveBeenCalledExactlyOnceWith({ servicePlanId: "plan-1", reason: undefined });
  expect(container.querySelector('[role="status"]')?.textContent).toContain(preview.pendingMessage);
  expect(mocks.canceled).toHaveBeenCalledOnce();
});

it("keeps the completed-cancellation message for a canceled plan", async () => {
  await render({ ...preview, status: "CANCELED", alreadyResolved: true, saveOfferAvailable: false });

  expect(container.textContent).toContain("This plan is already canceled");
  expect(container.textContent).not.toContain(preview.pendingMessage);
  expect(button("Cancel my plan")).toBeUndefined();
  expect(mocks.cancel).not.toHaveBeenCalled();
});
