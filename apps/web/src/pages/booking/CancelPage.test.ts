// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import CancelPage from "./CancelPage";

const fetchMock = vi.fn<typeof fetch>();
let container: HTMLDivElement;
let root: Root;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("VITE_BOOKING_API_URL", "https://booking.test");
  fetchMock.mockReset();
  window.history.replaceState({}, "", "/cancel?token=test-cancellation-token");
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function confirmWith(response: Response) {
  fetchMock.mockResolvedValueOnce(jsonResponse({
    booking: { service: "GENERAL_PEST", date: "2026-10-30", amountCents: 24900 },
    refund: { kind: "FULL", amountCents: 24900 },
    policy: "Full refund before the cancellation deadline.",
  }));
  await act(async () => {
    root.render(createElement(BrowserRouter, null, createElement(CancelPage)));
  });
  expect(container.querySelector("h1")?.textContent).toBe("Cancel this appointment?");

  fetchMock.mockResolvedValueOnce(response);
  await act(async () => container.querySelector("button")!.click());
  expect(fetchMock).toHaveBeenLastCalledWith(
    "https://booking.test/cancel",
    expect.objectContaining({
      body: JSON.stringify({ token: "test-cancellation-token", confirm: true }),
    }),
  );
}

it.each(["json", "text"])(
  "does not promise refund protection for a generic %s service outage",
  async (format) => {
    await confirmWith(format === "json"
      ? jsonResponse({ error: "Service unavailable. Please try again." }, 503)
      : new Response("Service unavailable", { status: 503 }));

    expect(container.querySelector("h1")?.textContent).toBe("Something went wrong.");
    expect(container.textContent).not.toContain("you’re covered");
    expect(container.textContent).not.toContain("Cancellation request recorded on");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      format === "json" ? "Service unavailable" : "non-JSON response",
    );
  },
);

it("does not claim cancellation succeeded when an HTTP 200 response contains no JSON", async () => {
  await confirmWith(new Response("<html>Service unavailable</html>", { status: 200 }));

  expect(container.querySelector("h1")?.textContent).toBe("Something went wrong.");
  expect(container.textContent).not.toContain("Your appointment is canceled.");
  expect(container.querySelector('[role="alert"]')?.textContent).toContain("non-JSON response");
});

it("shows the cancellation confirmation after a valid successful response", async () => {
  await confirmWith(jsonResponse({ canceled: true, refunded: true }));

  expect(container.querySelector("h1")?.textContent).toBe("Your appointment is canceled.");
  expect(container.textContent).toContain("A full refund is on its way");
  expect(container.querySelector('[role="alert"]')).toBeNull();
});

it("preserves the backend's refund reassurance and recorded date after a cancellation failure", async () => {
  const reassurance = "We've recorded your request, so your full refund still applies.";
  await confirmWith(jsonResponse({
    error: "We couldn't cancel your appointment just now.",
    cancellationRecordedOn: "2026-10-15",
    reassurance,
  }, 503));

  expect(container.querySelector("h1")?.textContent).toContain("you’re covered");
  expect(container.textContent).toContain(reassurance);
  expect(container.textContent).toContain("Cancellation request recorded on 2026-10-15");
});
