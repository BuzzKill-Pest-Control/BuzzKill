/** Destination rehearsal only. Unset preserves the existing production behavior. */
export function isMigrationPreview(): boolean {
  return process.env.BUZZKILL_MIGRATION_PREVIEW === "true";
}

export const MIGRATION_PREVIEW_MESSAGE =
  "Migration preview: business actions and external services are disabled.";

/** Refuse before reading the request, initializing a data client, or invoking a provider. */
export function assertBusinessActionsEnabled(): void {
  if (isMigrationPreview()) throw new Error(MIGRATION_PREVIEW_MESSAGE);
}
