import { expect, it } from "vitest";
import { previewAdminLoginAvailable } from "./previewAdmin";
it("shows the administrator-only login affordance only on the expiring isolated main preview", () => {
  const env = { VITE_BUZZKILL_MIGRATION_PREVIEW: "true", VITE_BUZZKILL_PREVIEW_ADMIN_LOGIN: "true", VITE_BUZZKILL_PREVIEW_ADMIN_LOGIN_UNTIL: "2026-10-29T17:00:00Z" } as unknown as ImportMetaEnv;
  const origin = "https://migration.d2y2zigtl5rx3.amplifyapp.com";
  const now = Date.parse("2026-10-29T16:00:00Z");
  expect(previewAdminLoginAvailable(env, origin, now)).toBe(true);
  expect(previewAdminLoginAvailable(env, origin, now + 3_600_000)).toBe(false);
  expect(previewAdminLoginAvailable(env, "https://app.pestbuzzkill.com", now)).toBe(false);
  expect(previewAdminLoginAvailable({ ...env, VITE_BUZZKILL_PREVIEW_ADMIN_LOGIN: "false" }, origin, now)).toBe(false);
  expect(previewAdminLoginAvailable({ ...env, VITE_BUZZKILL_PREVIEW_ADMIN_LOGIN_UNTIL: "invalid" }, origin, now)).toBe(false);
});
