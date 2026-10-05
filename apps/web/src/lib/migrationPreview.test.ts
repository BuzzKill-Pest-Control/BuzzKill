import { afterEach, expect, it, vi } from "vitest";
import { submitLead } from "./leadIntakeApi";
import { requestQuote } from "./bookingApi";
import { portalUrl } from "./portal";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it("refuses preview contact/booking before network and source CRM fallback", async () => {
  vi.stubEnv("VITE_BUZZKILL_MIGRATION_PREVIEW", "true"); vi.stubEnv("VITE_PORTAL_URL", "");
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  expect(await submitLead({ first: "Synthetic", formId: "test" })).toMatchObject({ ok: false });
  expect(await requestQuote({} as Parameters<typeof requestQuote>[0])).toMatchObject({ ok: false, status: 503 });
  expect(fetch).not.toHaveBeenCalled(); expect(portalUrl("preview.example.invalid")).toBe("#migration-preview");
});
