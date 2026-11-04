import { Stack } from "aws-cdk-lib";
import type { IUserPool } from "aws-cdk-lib/aws-cognito";
import { Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import type { IFunction } from "aws-cdk-lib/aws-lambda";

/** Grant this trigger access only to its own user pool, without a CFN cycle. */
export function grantGoogleAccountLinking(fn: IFunction, userPool: IUserPool): void {
  if (!fn.role) throw new Error("Google sign-in requires a Lambda execution role.");

  // The user pool already depends on its trigger Lambda. A default policy
  // created under the role makes the Lambda depend on that policy too, which
  // closes a cycle back to the pool. Attach a separate stack-level policy:
  // the function can be created before the pool, then this policy grants the
  // exact pool ARN once both exist.
  const policy = new Policy(Stack.of(fn), "GoogleSignInAccountLinking", {
    statements: [new PolicyStatement({
      actions: ["cognito-idp:AdminGetUser", "cognito-idp:AdminLinkProviderForUser"],
      resources: [userPool.userPoolArn],
    })],
  });
  policy.attachToRole(fn.role);
}
