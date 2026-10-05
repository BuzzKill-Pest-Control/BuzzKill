import { defineFunction } from "@aws-amplify/backend";

/** Wired only during the migration rehearsal; no mail provider permissions. */
export const previewAuthMessage = defineFunction({
  name: "preview-auth-message",
  entry: "./handler.ts",
  resourceGroupName: "auth",
});
