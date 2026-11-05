import { isMigrationPreview } from "../shared/migrationPreview";
import { defineFunction } from "@aws-amplify/backend";

/**
 * GL-22 — the alarm-to-owned-work bridge. Every CloudWatch alarm (Lambda
 * errors, scheduled jobs that did not run, the email-event dead-letter
 * queue) publishes to the ops-alarms SNS topic; this function turns each
 * alarm into ONE deduplicated shared-Office work item (INFRA_ALERT, keyed
 * by alarm name, common one-business-day clock, escalation via the normal
 * overdue sweep) and a sanitized Sentry incident. Independent SNS-to-Slack
 * fallback and watchdog notifications do not depend on Sentry or SES.
 */
export const opsAlerts = defineFunction({
  environment: { BUZZKILL_MIGRATION_PREVIEW: String(isMigrationPreview()) },
  name: "ops-alerts",
  entry: "./handler.ts",
  timeoutSeconds: 60,
  memoryMB: 256,
});
