import { createHash } from "node:crypto";

/** Keep the physical backend namespace separate from production business mode. */
export function businessEnvironment(env = process.env): string {
  const branch = env.AWS_BRANCH ?? "staging";
  const requested = env.BUZZKILL_SOURCE_ENVIRONMENT;
  const destinationBranches: Record<string, string> = {
    "codex-buzzkill-account-migration": "main",
    "codex-buzzkill-staging-migration": "staging",
  };
  if (requested !== undefined) {
    if (env.AWS_APP_ID !== "d3owdoeg1om341" ||
        env.BUZZKILL_DESTINATION_ACCOUNT_ID !== "743917687359" ||
        !Object.hasOwn(destinationBranches, branch) ||
        destinationBranches[branch] !== requested) {
      throw new Error("Business environment override does not match the isolated destination backend.");
    }
    return requested;
  }
  if (env.AWS_APP_ID === "d3owdoeg1om341" && Object.hasOwn(destinationBranches, branch) && env.BUZZKILL_MIGRATION_PREVIEW !== "true") {
    throw new Error("Destination release requires an explicit matching business environment.");
  }
  return branch;
}

/** The pipeline supplies this value only after a live STS identity check. */
export function assertDestinationDeploymentIdentity(account: string, region: string): void {
  if (account !== "743917687359" || region !== "us-east-1") {
    throw new Error("Migration configuration requires the dedicated BuzzKill destination account and region.");
  }
}

/** Destination retention must survive preview activation without a vault replacement. */
export function retentionVaultName(appId: string, branch: string, preview: boolean): string {
  return preview || appId === "d3owdoeg1om341"
    ? `buzzkill-preview-${createHash("sha256").update(`${appId}:${branch}`).digest("hex").slice(0, 16)}-retention`
    : `buzzkill-${branch}-retention`;
}
