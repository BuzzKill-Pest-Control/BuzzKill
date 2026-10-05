import { CfnResource, Stack } from "aws-cdk-lib";
import { CfnResolver } from "aws-cdk-lib/aws-appsync";
import { isMigrationPreview, MIGRATION_PREVIEW_MESSAGE } from "./functions/shared/migrationPreview";

export const PREVIEW_MUTATION_REFUSAL =
  `$util.error(${JSON.stringify(MIGRATION_PREVIEW_MESSAGE)}, "Unauthorized")`;

/** Deny at the resolver boundary, before a generated pipeline can write data.
 * Lambda guards alone cannot protect generated model CRUD. Keep the schema,
 * auth, queries and physical resources intact for migration permission checks.
 */
export function makeMigrationPreviewReadOnly(dataStack: Stack): number {
  if (!isMigrationPreview()) return 0;
  let guarded = 0;
  for (const resource of dataStack.node.findAll().filter(CfnResource.isCfnResource)) {
    if (resource.cfnResourceType !== "AWS::AppSync::Resolver") continue;
    const resolver = resource as CfnResolver;
    if (resolver.typeName !== "Mutation") continue;
    // The reviewed backend uses VTL for every mutation. A future runtime
    // change must get an explicit refusal implementation, never bypass this.
    if (resolver.runtime || resolver.code || resolver.codeS3Location) {
      throw new Error(`Migration preview cannot guard this mutation runtime: ${resolver.node.path}`);
    }
    resolver.requestMappingTemplateS3Location = undefined;
    resolver.requestMappingTemplate = PREVIEW_MUTATION_REFUSAL;
    guarded++;
  }
  if (!guarded) throw new Error("Migration preview found no mutation resolvers to guard.");
  return guarded;
}
