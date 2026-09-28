// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readLeadToken, type LeadPrefill, type PricedQuote } from "../../lib/bookingApi";
import { loadFunnelState } from "../../lib/bookingFunnel";
import QuotePage from "./QuotePage";

// The decorative canvas is unrelated to link restoration and has no jsdom renderer.
vi.mock("../../components/BugZapper", () => ({ default: () => null }));

const leadToken = "office-lead-identity-123456";
const prefill: LeadPrefill = {
  name: "Dana Whitfield",
  email: "dana@example.com",
  phone: "+14015550123",
  address: { street: "12 Elm St", city: "Providence", state: "RI", zip: "02903" },
};
const pricedQuote: PricedQuote = {
  bookingId: "saved-booking",
  decision: "PRICED",
  service: "General pest control",
  recurringOffer: null,
  days: [{ date: "2026-09-30", priceCents: 24900 }],
  expiresAt: "2026-09-29T12:00:00.000Z",
  statusToken: "saved-quote-capability",
};
const fetchMock = vi.fn<typeof fetch>();
let container: HTMLDivElement;
let root: Root;

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function mount(location: string) {
  window.history.replaceState({}, "", location);
  root = createRoot(container);
  await act(async () => {
    root.render(createElement(BrowserRouter, null, createElement(QuotePage)));
  });
}

function input(id: string): HTMLInputElement {
  const element = container.querySelector<HTMLInputElement>(`#${id}`);
  if (!element) throw new Error(`Missing input: ${id}`);
  return element;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-28T12:00:00.000Z"));
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubEnv("VITE_BOOKING_API_URL", "https://booking.test");
  window.sessionStorage.clear();
  fetchMock.mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("office booking links", () => {
  it.each(["/quote", "/quote/instant"])(
    "retains lead identity, prefills the form, and submits that identity from %s",
    async (path) => {
      fetchMock.mockResolvedValueOnce(jsonResponse(prefill));
      await mount(`${path}?lead=${leadToken}&utm_source=office#details`);

      expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
        "https://booking.test/lead-prefill",
        expect.objectContaining({ body: JSON.stringify({ leadToken }) })
      );
      expect(readLeadToken(window.sessionStorage)).toBe(leadToken);
      expect(window.location.pathname).toBe(path);
      expect(window.location.search).toBe("?utm_source=office");
      expect(window.location.hash).toBe("#details");
      expect(input("bq-name").value).toBe(prefill.name);
      expect(input("bq-email").value).toBe(prefill.email);
      expect(input("bq-phone").value).toBe(prefill.phone);
      expect(input("bq-street").value).toBe(prefill.address.street);
      expect(input("bq-city").value).toBe(prefill.address.city);
      expect(input("bq-state").value).toBe("RI");
      expect(input("bq-zip").value).toBe(prefill.address.zip);

      // Complete the one field the lead link cannot prefill, then submit the
      // real form and transport to verify the retained identity travels with it.
      await act(async () => {
        const field = input("bq-sqft");
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
        setter.call(field, "2400");
        field.dispatchEvent(new Event("input", { bubbles: true }));
      });
      fetchMock.mockResolvedValueOnce(jsonResponse(pricedQuote));
      await act(async () => {
        container.querySelector("form")!.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true })
        );
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const [url, init] = fetchMock.mock.calls[1];
      expect(url).toBe("https://booking.test/quote");
      expect(JSON.parse(String(init?.body))).toMatchObject({
        leadToken,
        name: prefill.name,
        email: prefill.email,
        address: prefill.address,
        sqft: 2400,
      });
      expect(loadFunnelState(window.sessionStorage)?.quote.bookingId).toBe("saved-booking");
    }
  );

  it("strips an invalid lead token without saving it or requesting prefill", async () => {
    await mount("/quote?lead=invalid&utm_source=office");
    expect(readLeadToken(window.sessionStorage)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(window.location.search).toBe("?utm_source=office");
    expect(input("bq-name").value).toBe("");
  });
});

describe("emailed quote resume links", () => {
  it.each(["/quote", "/quote/instant"])(
    "restores and polls the saved quote after removing the capability from %s",
    async (path) => {
      await mount(`${path}?utm_source=email#request=saved-booking&token=saved-quote-capability`);

      expect(window.location.pathname).toBe(path);
      expect(window.location.search).toBe("?utm_source=email");
      expect(window.location.hash).toBe("");
      expect(container.textContent).toContain("Your request is saved");
      expect(fetchMock).not.toHaveBeenCalled();

      // Reload the now-clean URL: restoration must use the captured request
      // and token, not depend on the capability still being in the address bar.
      await act(async () => root.unmount());
      await mount(`${path}?utm_source=email`);
      expect(container.textContent).toContain("Your request is saved");
      fetchMock.mockResolvedValueOnce(jsonResponse(pricedQuote));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(750);
      });

      expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
        "https://booking.test/quote-status",
        expect.objectContaining({
          body: JSON.stringify({ bookingId: "saved-booking", statusToken: "saved-quote-capability" }),
        })
      );
      expect(loadFunnelState(window.sessionStorage)?.quote).toMatchObject(pricedQuote);
      expect(container.textContent).toContain("Continue to booking");
      expect(container.textContent).not.toContain("Your request is saved");
    }
  );
});
