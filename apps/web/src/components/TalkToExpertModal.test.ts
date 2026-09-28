// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { submitLead } from "../lib/leadIntakeApi";
import { TalkToExpertProvider, useTalkToExpert } from "./TalkToExpertModal";

vi.mock("../lib/leadIntakeApi", () => ({ submitLead: vi.fn() }));
vi.mock("../lib/analytics", () => ({
  trackFormSubmit: vi.fn(),
  trackGenerateLead: vi.fn(),
  trackAdsConversion: vi.fn(),
  ADS_CONVERSIONS: { QUOTE_COMPLETED: "quote-completed" },
}));

const submitLeadMock = vi.mocked(submitLead);
let container: HTMLDivElement;
let root: Root;

function RequestButtons() {
  const { open, openForRequest } = useTalkToExpert();
  return createElement(
    "div",
    null,
    createElement("button", { id: "inspection", onClick: () => openForRequest("Attic restoration inspection") }, "Request inspection"),
    createElement("button", { id: "generic", onClick: open }, "Talk to an expert")
  );
}

async function click(selector: string) {
  const button = container.querySelector<HTMLButtonElement>(selector);
  if (!button) throw new Error(`Missing button: ${selector}`);
  await act(async () => button.click());
}

async function submitContact() {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    for (const [id, value] of [["tte-name", "Dana Whitfield"], ["tte-email", "dana@example.com"]]) {
      const field = container.querySelector<HTMLInputElement>(`#${id}`)!;
      setter.call(field, value);
      field.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });
  await act(async () => {
    container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}

beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  submitLeadMock.mockReset().mockResolvedValue({ ok: true, leadId: "test-lead" });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(createElement(TalkToExpertProvider, { children: createElement(RequestButtons) }));
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("service-specific callback requests", () => {
  it("submits the inspection reason and clears it for a later generic callback", async () => {
    await click("#inspection");
    await submitContact();

    expect(submitLeadMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      first: "Dana",
      last: "Whitfield",
      email: "dana@example.com",
      formId: "talk-to-expert",
      reason: "Attic restoration inspection",
    }));

    await click('button[aria-label="Close"]');
    await click("#generic");
    await submitContact();

    expect(submitLeadMock).toHaveBeenCalledTimes(2);
    expect(submitLeadMock.mock.calls[1][0]).toMatchObject({ formId: "talk-to-expert" });
    expect(submitLeadMock.mock.calls[1][0].reason).toBeUndefined();
  });

  it("clears the service reason when a generic request replaces an open request", async () => {
    await click("#inspection");
    await click("#generic");
    await submitContact();

    expect(submitLeadMock).toHaveBeenCalledOnce();
    expect(submitLeadMock.mock.calls[0][0].reason).toBeUndefined();
  });
});
