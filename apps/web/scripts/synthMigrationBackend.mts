/** Offline only: build the real backend assembly with fake credentials. */
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { syncBuiltinESMExports } from "node:module";
import { resolve } from "node:path";

const [outdir, phase, branch] = process.argv.slice(2);
if (!outdir || !["full", "bootstrap"].includes(phase) || ![
  "codex-buzzkill-account-migration", "codex-buzzkill-staging-migration",
].includes(branch)) throw new Error("Expected output directory, full/bootstrap, and a migration branch.");

const noNetwork = () => { throw new Error("Network is forbidden during offline migration synthesis."); };
http.request = noNetwork;
http.get = noNetwork;
https.request = noNetwork;
https.get = noNetwork;
net.connect = noNetwork;
net.createConnection = noNetwork;
net.Socket.prototype.connect = noNetwork;
globalThis.fetch = noNetwork;
syncBuiltinESMExports();

for (const key of Object.keys(process.env)) {
  if (/^(AWS_|CDK_|AMPLIFY_|BUZZKILL_|ANTHROPIC_|GOOGLE_|STRIPE_|THUMBTACK_)/.test(key)) delete process.env[key];
}
const prefix = branch === "codex-buzzkill-account-migration" ? "migration" : "migration-staging";
Object.assign(process.env, {
  AWS_ACCESS_KEY_ID: "offline-synthesis",
  AWS_SECRET_ACCESS_KEY: "offline-synthesis",
  AWS_CONFIG_FILE: "/dev/null",
  AWS_SHARED_CREDENTIALS_FILE: "/dev/null",
  AWS_EC2_METADATA_DISABLED: "true",
  AWS_REGION: "us-east-1",
  CDK_DEFAULT_REGION: "us-east-1",
  CDK_DEFAULT_ACCOUNT: "743917687359",
  AWS_APP_ID: "d3owdoeg1om341",
  AWS_BRANCH: branch,
  BUZZKILL_MIGRATION_PREVIEW: "true",
  BUZZKILL_MIGRATION_BOOTSTRAP: String(phase === "bootstrap"),
  BUZZKILL_DESTINATION_ACCOUNT_ID: "743917687359",
  BUZZKILL_BOOTSTRAP_EMPTY_DESTINATION_CONFIRMED: "true",
  MARKETING_URL: `https://${prefix}.d3owdoeg1om341.amplifyapp.com`,
  CRM_APP_URL: `https://${prefix}.d2y2zigtl5rx3.amplifyapp.com`,
  CDK_OUTDIR: resolve(outdir),
  CDK_CONTEXT_JSON: JSON.stringify({
    "amplify-backend-namespace": "d3owdoeg1om341",
    "amplify-backend-name": branch,
    "amplify-backend-type": "branch",
    "aws:cdk:bundling-stacks": ["**"],
  }),
});

await import("../amplify/backend.ts");
// Amplify's default app registers this synthesis hook. It performs no deploy.
process.emit("message", "amplifySynth");
