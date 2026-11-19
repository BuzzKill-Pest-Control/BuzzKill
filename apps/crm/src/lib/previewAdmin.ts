/** UI affordance only; Cognito independently enforces the exact approved identity. */
export function previewAdminLoginAvailable(env = import.meta.env, origin = window.location.origin, now = Date.now()): boolean {
  return env.VITE_BUZZKILL_MIGRATION_PREVIEW === "true" &&
    env.VITE_BUZZKILL_PREVIEW_ADMIN_LOGIN === "true" &&
    origin === "https://migration.d2y2zigtl5rx3.amplifyapp.com" &&
    Date.parse(env.VITE_BUZZKILL_PREVIEW_ADMIN_LOGIN_UNTIL ?? "") > now;
}
