import { App, Stack } from "aws-cdk-lib";
import { UserPool, UserPoolOperation } from "aws-cdk-lib/aws-cognito";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { afterAll, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { grantGoogleAccountLinking } from "./google-account-linking";

const outdir = mkdtempSync(join(tmpdir(), "buzzkill-google-auth-policy-"));
afterAll(() => rmSync(outdir, { recursive: true, force: true }));

type Resource = {
  Type: string;
  Properties: Record<string, unknown>;
  DependsOn?: string[];
};

/** CloudFormation follows implicit Ref/GetAtt dependencies as well as DependsOn. */
function assertAcyclic(resources: Record<string, Resource>): void {
  const references = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.flatMap(references);
    if (!value || typeof value !== "object") return [];
    const object = value as Record<string, unknown>;
    const dependencies: string[] = [];
    if (typeof object.Ref === "string") dependencies.push(object.Ref);
    if (object["Fn::GetAtt"]) {
      const attr = object["Fn::GetAtt"];
      dependencies.push(Array.isArray(attr) ? String(attr[0]) : String(attr).split(".")[0]);
    }
    return [...dependencies, ...Object.values(object).flatMap(references)];
  };
  const done = new Set<string>();
  const visit = (id: string, path: string[]): void => {
    if (path.includes(id)) throw new Error(`CloudFormation cycle: ${[...path, id].join(" -> ")}`);
    if (done.has(id)) return;
    const resource = resources[id];
    for (const dependency of [
      ...references(resource.Properties),
      ...(resource.DependsOn ?? []),
    ]) {
      if (Object.hasOwn(resources, dependency)) visit(dependency, [...path, id]);
    }
    done.add(id);
  };
  Object.keys(resources).forEach((id) => visit(id, []));
}

it("grants only lookup/link on the exact pool without a pool-trigger-policy dependency cycle", () => {
  const app = new App({ outdir });
  const stack = new Stack(app, "GoogleAuthRegression");
  const userPool = new UserPool(stack, "Pool");
  const fn = new Function(stack, "GoogleSignIn", {
    runtime: Runtime.NODEJS_20_X,
    handler: "index.handler",
    code: Code.fromInline("exports.handler = async event => event;"),
  });
  userPool.addTrigger(UserPoolOperation.PRE_SIGN_UP, fn);
  grantGoogleAccountLinking(fn, userPool);

  const { Resources: resources } = app.synth().getStackArtifact(stack.artifactId).template as {
    Resources: Record<string, Resource>;
  };
  const poolId = Object.keys(resources).find((id) => resources[id].Type === "AWS::Cognito::UserPool")!;
  const policies = Object.values(resources).filter((resource) => resource.Type === "AWS::IAM::Policy");
  expect(policies).toHaveLength(1);
  expect(policies[0].Properties.PolicyDocument).toEqual({
    Version: "2012-10-17",
    Statement: [{
      Action: ["cognito-idp:AdminGetUser", "cognito-idp:AdminLinkProviderForUser"],
      Effect: "Allow",
      Resource: { "Fn::GetAtt": [poolId, "Arn"] },
    }],
  });
  expect(() => assertAcyclic(resources)).not.toThrow();
});
