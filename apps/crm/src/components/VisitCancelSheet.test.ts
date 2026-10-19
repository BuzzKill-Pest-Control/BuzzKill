// @vitest-environment jsdom
import { act, createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VisitChangePreview } from "../lib/api";
import VisitCancelSheet from "./VisitCancelSheet";

const mocks = vi.hoisted(() => ({ preview: vi.fn(), cancel: vi.fn(), done: vi.fn() }));
vi.mock("../lib/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("../lib/api")>(),
  previewVisitChange: mocks.preview,
  cancelVisit: mocks.cancel,
}));

function preview(jobId: string, amountCents: number): VisitChangePreview {
  return {
    jobId, customerId: "customer", customerName: "Test customer", customerEmail: null,
    serviceType: `Service ${jobId}`, scheduledDate: "2099-10-25", status: "SCHEDULED",
    changeable: true, alreadyCanceled: false, amountPaidCents: amountCents, amountOpenCents: 0,
    policy: {
      policyDeadline: null, withinFreeWindow: true, daysUntilVisit: 6,
      amountPaidCents: amountCents, refundableCents: amountCents, feeCents: 0,
      explanation: "Full refund available.",
    },
    decisions: {
      reschedule: { available: true, description: "Reschedule this visit." },
      cancelRefund: { available: true, amountCents, description: "Refund this visit." },
    },
    planConsequence: "Plan stays active.", routeConsequence: "Stop removed.",
    noticePreview: "A cancellation notice will be sent.",
  };
}

// CustomerDetail keeps the sheet mounted when it closes and selects another job.
function VisitPicker() {
  const [jobId, setJobId] = useState<string | null>(null);
  return createElement("div", null,
    ...["first", "second"].map((id) => createElement("button", {
      key: id, onClick: () => setJobId(id),
    }, `Open ${id}`)),
    createElement(VisitCancelSheet, {
      jobId, open: jobId !== null, onClose: () => setJobId(null), onDone: mocks.done,
    }),
  );
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Unexpected network request"); }));
  mocks.preview.mockReset();
  mocks.cancel.mockReset().mockResolvedValue({ data: {
    outcome: "COMPLETE", message: "Visit canceled.",
  } });
  mocks.done.mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function click(label: string) {
  const button = Array.from(container.querySelectorAll("button"))
    .find((element) => element.textContent === label || element.getAttribute("aria-label") === label);
  expect(button).toBeDefined();
  await act(async () => button!.click());
}

describe("visit cancellation previews", () => {
  it.each(["success", "failure"])("ignores a previous visit's late %s after another visit opens", async (result) => {
    let resolveFirst!: (value: unknown) => void;
    let rejectFirst!: (error: Error) => void;
    mocks.preview.mockImplementationOnce(() => new Promise((resolve, reject) => {
      resolveFirst = resolve;
      rejectFirst = reject;
    })).mockResolvedValueOnce({ data: preview("second", 25000) });

    await act(async () => root.render(createElement(VisitPicker)));
    expect(mocks.preview).not.toHaveBeenCalled();
    await click("Open first");
    expect(container.textContent).toContain("Loading the visit");
    await click("Close");
    await click("Open second");
    expect(mocks.preview.mock.calls).toEqual([[{ jobId: "first" }], [{ jobId: "second" }]]);

    await act(async () => {
      if (result === "success") resolveFirst({ data: preview("first", 10000) });
      else rejectFirst(new Error("First preview unavailable"));
    });

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain("Service second");
    expect(dialog?.textContent).toContain("$250.00");
    expect(dialog?.textContent).not.toContain("Service first");
    expect(dialog?.querySelector('[role="alert"]')).toBeNull();
    await click("Cancel this visit");
    expect(mocks.cancel).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ jobId: "second" }));
    expect(mocks.done).toHaveBeenCalledTimes(1);
    expect(dialog?.textContent).toContain("Visit canceled.");
  });

  it("shows the current visit's preview failure without offering cancellation", async () => {
    mocks.preview.mockResolvedValueOnce({ data: null, errors: [{ message: "Preview unavailable" }] });
    await act(async () => root.render(createElement(VisitPicker)));
    await click("Open first");
    expect(container.querySelector('[role="alert"]')?.textContent).toBe("Preview unavailable");
    expect(container.textContent).not.toContain("Cancel this visit");
    expect(mocks.cancel).not.toHaveBeenCalled();
  });
});
