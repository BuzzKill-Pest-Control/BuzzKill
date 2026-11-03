import { defineFunction } from "@aws-amplify/backend";
import { isMigrationPreview } from "../shared/migrationPreview";

/** Link Google identities to already-provisioned BuzzKill logins. */
export const googleSignIn = defineFunction({
  name: "google-sign-in",
  entry: "./handler.ts",
  // The user pool references its trigger, so keep both in the auth stack.
  resourceGroupName: "auth",
  environment: { BUZZKILL_MIGRATION_PREVIEW: String(isMigrationPreview()) },
});
