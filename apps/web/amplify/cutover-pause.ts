import { CfnResource, Stack } from "aws-cdk-lib";
import { CfnFunction } from "aws-cdk-lib/aws-lambda";
import { CfnSchedule } from "aws-cdk-lib/aws-scheduler";
import { businessEnvironment, assertDestinationDeploymentIdentity } from "./deployment-environment";

/** Separate from rehearsal mode: production configuration, deliberately no workers. */
export function isCutoverPaused(env = process.env): boolean {
  const flag = env.BUZZKILL_CUTOVER_PAUSED;
  if (flag === undefined || flag === "false") return false;
  if (flag !== "true" || env.BUZZKILL_MIGRATION_PREVIEW !== "false" ||
      env.BUZZKILL_PREVIEW_ADMIN_LOGIN === "true" ||
      env.BUZZKILL_MIGRATION_BOOTSTRAP === "true" ||
      env.AWS_APP_ID !== "d3owdoeg1om341" ||
      env.BUZZKILL_DESTINATION_ACCOUNT_ID !== "743917687359" ||
      !env.BUZZKILL_SOURCE_ENVIRONMENT) {
    throw new Error("Cutover pause requires the dedicated destination release configuration.");
  }
  businessEnvironment(env);
  assertDestinationDeploymentIdentity(env.BUZZKILL_DEPLOY_ACCOUNT_ID ?? "", env.AWS_REGION ?? "");
  return true;
}

/** Keep execution paused while normal API resolvers and frontend configuration deploy.
 * Unlike the full cutover pause, this does not alter API or browser behavior.
 */
export function areWorkersPaused(env = process.env): boolean {
  const cutover = isCutoverPaused(env);
  const flag = env.BUZZKILL_WORKERS_PAUSED;
  if (flag === undefined || flag === "false") return cutover;
  if (flag !== "true") throw new Error("Invalid worker pause flag.");
  // Reuse the exact destination/account/business binding checks. This override
  // exists only inside validation; the real API/frontend pause stays unchanged.
  isCutoverPaused({ ...env, BUZZKILL_CUTOVER_PAUSED: "true" });
  return true;
}

/** Keep an externally established fence explicit throughout CloudFormation updates.
 * Framework providers stay runnable so deployment can finish. No stream cursor is
 * introduced; new mappings require a separately reviewed replay strategy.
 */
export function applyWorkerPause(stack: Stack, preTokenFunction: CfnFunction): void {
  if (!areWorkersPaused()) return;
  let root = stack;
  while (root.nestedStackParent) root = root.nestedStackParent;
  let functions = 0, schedules = 0;
  for (const resource of root.node.findAll().filter(CfnResource.isCfnResource)) {
    if (resource.cfnResourceType === "AWS::Lambda::EventSourceMapping") {
      throw new Error("Cutover pause requires explicit review before introducing a stream/event mapping.");
    }
    if (resource.cfnResourceType === "AWS::Lambda::Function") {
      const fn = resource as CfnFunction;
      const environment = Stack.of(fn).resolve(fn.environment) as { variables?: Record<string, unknown> } | undefined;
      if (fn !== preTokenFunction && !Object.hasOwn(environment?.variables ?? {}, "BUZZKILL_MIGRATION_PREVIEW")) continue;
      fn.reservedConcurrentExecutions = 0;
      functions++;
    }
    if (resource.cfnResourceType === "AWS::Scheduler::Schedule") {
      (resource as CfnSchedule).state = "DISABLED";
      schedules++;
    }
  }
  if (functions !== 18 || schedules !== 3) {
    throw new Error(`Cutover pause coverage changed: ${functions} application functions, ${schedules} schedules.`);
  }
}
