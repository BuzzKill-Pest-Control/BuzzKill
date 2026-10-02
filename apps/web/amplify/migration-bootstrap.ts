import { CfnResource, NestedStack, Stack } from "aws-cdk-lib";

/** Explicit, reviewed selection. Values are [pipeline functions, resolvers].
 * Every table, datasource, role, schema and auth resource remains in phase one.
 * This flag is only for a fresh, empty destination bootstrap. Never enable it
 * on an existing populated backend: it would remove these API operations.
 */
export const BOOTSTRAP_DEFERRED_MODELS = {
  Agreement: [26, 8],
  BookingCommsSend: [26, 8],
  BookingFinalization: [26, 8],
  BookingRequest: [35, 11],
  CallbackRequest: [29, 9],
  CapacityClaim: [29, 9],
  CapacityDay: [29, 9],
  CatalogVersion: [26, 8],
  CompanyClosure: [29, 9],
  ConsentAudit: [29, 9],
  Customer: [38, 12],
  CustomerGroup: [26, 8],
  CustomerLifecycleClaim: [26, 8],
  CustomerLifecycleCommand: [29, 9],
  CustomerLifecycleEvent: [29, 9],
  Dispute: [32, 10],
  EmailLog: [32, 10],
  GroupChangeCommand: [29, 9],
  Invoice: [32, 10],
  Job: [38, 12],
  JobAssignmentEvent: [29, 9],
  JobPacketEvent: [29, 9],
  LeadActivity: [29, 9],
  LeadIntakeClaim: [26, 8],
  LeadLifecycleClaim: [26, 8],
} as const;

const TYPES = ["AWS::AppSync::FunctionConfiguration", "AWS::AppSync::Resolver"] as const;
const ACCOUNT = "743917687359";
const APP = "d3owdoeg1om341";
const BRANCHES = ["codex-buzzkill-account-migration", "codex-buzzkill-staging-migration"];

export function bootstrapEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const flag = env.BUZZKILL_MIGRATION_BOOTSTRAP;
  if (flag === undefined || flag === "false") return false;
  if (flag !== "true") throw new Error("Migration bootstrap flag must be true or false.");
  if (
    env.BUZZKILL_MIGRATION_PREVIEW !== "true" ||
    env.BUZZKILL_DESTINATION_ACCOUNT_ID !== ACCOUNT ||
    env.CDK_DEFAULT_ACCOUNT !== ACCOUNT ||
    env.AWS_APP_ID !== APP ||
    !BRANCHES.includes(env.AWS_BRANCH ?? "") ||
    env.BUZZKILL_BOOTSTRAP_EMPTY_DESTINATION_CONFIRMED !== "true"
  ) {
    throw new Error("Migration bootstrap requires the exact empty destination preview scope.");
  }
  return true;
}

/** Called after backend construction. Physical omission avoids depending on
 * whether CloudFormation counts false-conditioned resources toward its nested
 * 2,500-resource operation quota. With the flag absent, no tree is inspected
 * or changed: the normal final template and logical IDs stay intact.
 *
 * A separate destination preflight must verify STS identity, a nonexistent
 * root stack, and no users/records/object history before setting the empty
 * acknowledgement. Offline full-template/reference parity is a release gate.
 */
export function applyMigrationBootstrap(dataStack: Stack): number {
  if (!bootstrapEnabled()) return 0;
  const api = dataStack.node.tryFindChild("amplifyData");
  if (!api) throw new Error("Migration bootstrap data construct layout changed.");
  const selected: CfnResource[] = [];
  for (const [model, expected] of Object.entries(BOOTSTRAP_DEFERRED_MODELS)) {
    const stack = api.node.tryFindChild(model);
    if (!stack || !NestedStack.isNestedStack(stack) || Stack.of(api) !== dataStack) {
      throw new Error(`Migration bootstrap model stack changed: ${model}`);
    }
    const resources = stack.node.findAll().filter(CfnResource.isCfnResource)
      .filter((resource) => Stack.of(resource) === stack);
    if (resources.filter((resource) => resource.cfnResourceType === "Custom::AmplifyDynamoDBTable").length !== 1) {
      throw new Error(`Migration bootstrap table mapping changed: ${model}`);
    }
    for (const [index, type] of TYPES.entries()) {
      const matches = resources.filter((resource) => resource.cfnResourceType === type);
      if (matches.length !== expected[index]) {
        throw new Error(`Migration bootstrap AppSync resource count changed: ${model}`);
      }
      selected.push(...matches);
    }
  }
  if (selected.length !== 962) throw new Error("Migration bootstrap selection changed.");
  // Validate the complete selection before removing anything. Only stateless
  // resources inside the 25 reviewed model stacks can reach this loop.
  for (const resource of selected) {
    if (!resource.node.scope?.node.tryRemoveChild(resource.node.id)) {
      throw new Error("Migration bootstrap could not omit a selected resource.");
    }
  }
  return selected.length;
}
