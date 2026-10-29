import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { submitLead } from "./leadIntakeApi";

const fetchMock = vi.fn<typeof fetch>();
const input = { first: "Test", email: "test@example.com", formId: "contact" };

beforeEach(() => {
  vi.stubEnv("VITE_LEAD_INTAKE_URL", "https://intake.test");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it.each([
  [200, "<html>Service unavailable</html>"],
  [200, '{"leadId":'],
  [204, null],
  [503, "Service unavailable"],
])("does not report a saved lead for unreadable HTTP %s body %s", async (status, body) => {
  fetchMock.mockResolvedValue(new Response(body, { status }));

  await expect(submitLead(input)).resolves.toEqual({
    ok: false,
    error: "We couldn't confirm your request. Please try again.",
  });
});

it("returns the saved lead after a valid successful response", async () => {
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ leadId: "test-lead" })));

  await expect(submitLead(input)).resolves.toEqual({ ok: true, leadId: "test-lead" });
});

it("preserves the server's customer-facing error", async () => {
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: "Enter an email or phone number." }), { status: 400 }));

  await expect(submitLead(input)).resolves.toEqual({
    ok: false,
    error: "Enter an email or phone number.",
  });
});
