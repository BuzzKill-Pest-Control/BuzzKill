import { afterAll, beforeAll, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { PREVIEW_MUTATION_REFUSAL } from "./migration-read-only";

type Resource = { Type: string; Properties?: Record<string, unknown>; [key: string]: unknown };
type Template = {
  Resources: Record<string, Resource>;
  Parameters?: Record<string, { Default?: unknown }>;
  Outputs?: Record<string, unknown>;
};
type Assembly = { templates: Record<string, Template>; assets: Record<string, string> };
const directory = mkdtempSync(join(tmpdir(), "buzzkill-migration-assembly-"));
const execFileAsync = promisify(execFile);
let full: Assembly;
let bootstrap: Assembly;
let adminLogin: Assembly;
let released: Assembly;
let pausedRelease: Assembly;

async function synth(phase: "full" | "bootstrap" | "release" | "paused-release", authTest = false): Promise<Assembly> {
  const outdir = join(directory, phase + (authTest ? "-auth" : ""));
  const branch = !authTest && process.env.AWS_BRANCH === "codex-buzzkill-staging-migration"
    ? process.env.AWS_BRANCH : "codex-buzzkill-account-migration";
  try {
    // Synthesis can exceed Vitest's RPC timeout on CI. Keep this worker's
    // event loop free to receive acknowledgements while the child runs.
    await execFileAsync(process.execPath, [
      "--import", "tsx", resolve("scripts/synthMigrationBackend.mts"), outdir, phase, branch, ...(authTest ? ["admin-login"] : []),
    ], { cwd: process.cwd(), encoding: "utf8", timeout: 120_000, maxBuffer: 16 * 1024 * 1024 });
  } catch (error) {
    const result = error as Error & { stdout?: string; stderr?: string };
    throw new Error(`Offline ${phase} synthesis failed: ${result.message}\n${result.stdout ?? ""}\n${result.stderr ?? ""}`);
  }
  const templates: Record<string, Template> = {};
  const assets: Record<string, string> = {};
  for (const name of readdirSync(outdir)) {
    if (name.endsWith(".template.json")) templates[name] = JSON.parse(readFileSync(join(outdir, name), "utf8"));
    if (name.endsWith(".assets.json")) {
      const manifest = JSON.parse(readFileSync(join(outdir, name), "utf8")) as {
        files: Record<string, { source: { path: string } }>;
      };
      for (const [hash, asset] of Object.entries(manifest.files)) assets[hash] = asset.source.path;
    }
  }
  return { templates, assets };
}

/** CloudFormation validates references per template. Nested transport must
 * also match the child's real parameters and Outputs, not only parent IDs.
 */
function assertReferenceClosure(assembly: Assembly): void {
  for (const [name, template] of Object.entries(assembly.templates)) {
    const resources = template.Resources;
    const children: Record<string, Template> = {};
    const fail = (message: string): never => { throw new Error(`${name}: ${message}`); };
    for (const [id, resource] of Object.entries(resources)) {
      if (resource.Type !== "AWS::CloudFormation::Stack") continue;
      const hash = JSON.stringify(resource.Properties?.TemplateURL).match(/([a-f0-9]{64})\.json/)?.[1];
      const child = hash && assembly.templates[assembly.assets[hash]];
      if (!child) throw new Error(`${name}: Cannot find nested template for ${id}`);
      children[id] = child;
      const supplied = (resource.Properties?.Parameters ?? {}) as Record<string, unknown>;
      for (const parameter of Object.keys(supplied)) {
        if (!Object.hasOwn(child.Parameters ?? {}, parameter)) fail(`Unknown nested parameter ${id}.${parameter}`);
      }
      for (const [parameter, config] of Object.entries(child.Parameters ?? {})) {
        if (!Object.hasOwn(config, "Default") && !Object.hasOwn(supplied, parameter)) {
          fail(`Missing nested parameter ${id}.${parameter}`);
        }
      }
    }
    const dependencies = new Map(Object.keys(resources).map((id) => [id, new Set<string>()]));
    let currentResource: string | undefined;
    const edge = (id: string) => {
      if (currentResource && Object.hasOwn(resources, id)) dependencies.get(currentResource)!.add(id);
    };
    const checkRef = (id: string) => {
      edge(id);
      if (!id.startsWith("AWS::") && !Object.hasOwn(resources, id) && !Object.hasOwn(template.Parameters ?? {}, id)) {
        fail(`Dangling Ref ${id}`);
      }
    };
    const checkAttribute = (id: string, attribute: string) => {
      edge(id);
      if (!Object.hasOwn(resources, id)) fail(`Dangling GetAtt ${id}`);
      if (children[id] && attribute.startsWith("Outputs.") && !Object.hasOwn(children[id].Outputs ?? {}, attribute.slice(8))) {
        fail(`Missing nested output ${id}.${attribute}`);
      }
    };
    const walk = (value: unknown): void => {
      if (Array.isArray(value)) { value.forEach(walk); return; }
      if (value === null || typeof value !== "object") return;
      const object = value as Record<string, unknown>;
      if (typeof object.Ref === "string") checkRef(object.Ref);
      if (object["Fn::GetAtt"]) {
        const getAtt = object["Fn::GetAtt"];
        const [id, ...attribute] = Array.isArray(getAtt) ? getAtt : String(getAtt).split(".");
        checkAttribute(String(id), attribute.join("."));
      }
      if (object.DependsOn) {
        for (const id of Array.isArray(object.DependsOn) ? object.DependsOn : [object.DependsOn]) {
          if (typeof id !== "string" || !Object.hasOwn(resources, id)) fail(`Dangling DependsOn ${String(id)}`);
          edge(String(id));
        }
      }
      if (object["Fn::Sub"]) {
        const sub = object["Fn::Sub"];
        const [pattern, substitutions] = Array.isArray(sub) ? sub : [sub, {}];
        for (const match of String(pattern).matchAll(/\$\{([^}]+)\}/g)) {
          const reference = match[1];
          if (reference.startsWith("!") || Object.hasOwn(substitutions, reference)) continue;
          const [id, ...attribute] = reference.split(".");
          if (attribute.length) checkAttribute(id, attribute.join(".")); else checkRef(id);
        }
      }
      Object.values(object).forEach(walk);
    };
    walk(template);
    for (const [id, resource] of Object.entries(resources)) { currentResource = id; walk(resource); }
    currentResource = undefined;
    const visited = new Set<string>(), active = new Set<string>();
    const visit = (id: string): void => {
      if (active.has(id)) fail(`Circular resource dependency at ${id}`);
      if (visited.has(id)) return;
      active.add(id);
      for (const dependency of dependencies.get(id)!) visit(dependency);
      active.delete(id); visited.add(id);
    };
    for (const id of dependencies.keys()) visit(id);
  }
}

function allResources(assembly: Assembly) {
  return Object.values(assembly.templates).flatMap((t) => Object.values(t.Resources));
}

beforeAll(async () => {
  full = await synth("full");
  bootstrap = await synth("bootstrap");
  adminLogin = await synth("full", true);
  released = await synth("release");
  pausedRelease = await synth("paused-release");
}, 600_000);
afterAll(() => rmSync(directory, { recursive: true, force: true }));

it("synthesizes the real full and bootstrap backends with closed references", () => {
  assertReferenceClosure(full);
  assertReferenceClosure(bootstrap);
  expect(allResources(full)).toHaveLength(3083);
  expect(allResources(bootstrap)).toHaveLength(2121);
  expect(allResources(full).filter((r) => r.Type === "AWS::AppSync::Resolver")).toHaveLength(606);
  expect(allResources(full).filter((r) => r.Type === "AWS::AppSync::FunctionConfiguration")).toHaveLength(1818);
});

it("retains the real schema, tables, auth, IAM and all other non-API resources across bootstrap", () => {
  const deferred = ["AWS::AppSync::Resolver", "AWS::AppSync::FunctionConfiguration", "AWS::CloudFormation::Stack"];
  for (const [name, template] of Object.entries(full.templates)) {
    for (const [id, resource] of Object.entries(template.Resources)) {
      if (!deferred.includes(resource.Type)) expect(bootstrap.templates[name]?.Resources[id]).toEqual(resource);
    }
  }
  expect(allResources(bootstrap).filter((r) => r.Type === "Custom::AmplifyDynamoDBTable")).toHaveLength(55);
});

it("refuses every real mutation in both phases, including retained PromoCode and Route writes", () => {
  for (const assembly of [full, bootstrap]) {
    const resolvers = allResources(assembly).filter((r) => r.Type === "AWS::AppSync::Resolver");
    const mutations = resolvers.filter((r) => r.Properties?.TypeName === "Mutation");
    expect(mutations.length).toBeGreaterThan(100);
    for (const mutation of mutations) {
      expect(mutation.Properties?.RequestMappingTemplate).toBe(PREVIEW_MUTATION_REFUSAL);
      expect(mutation.Properties).not.toHaveProperty("RequestMappingTemplateS3Location");
    }
    for (const model of ["PromoCode", "Route"]) {
      for (const action of ["create", "update", "delete"]) {
        expect(mutations.some((r) => r.Properties?.FieldName === `${action}${model}`)).toBe(true);
      }
    }
    for (const query of resolvers.filter((r) => r.Properties?.TypeName === "Query")) {
      expect(query.Properties?.RequestMappingTemplate).not.toBe(PREVIEW_MUTATION_REFUSAL);
    }
    const outputs = JSON.stringify(Object.values(assembly.templates).map((t) => t.Outputs));
    expect(outputs).toContain(`migrationApiReady\\":${assembly === full}`);
  }
});

it.each(["Ref", "Fn::GetAtt", "DependsOn", "Fn::Sub"])("detects broken %s even when real resource counts are unchanged", (kind) => {
  const broken = structuredClone(bootstrap);
  const template = Object.values(broken.templates)[0];
  const target = Object.values(template.Resources)[0];
  const missing = "RemovedBootstrapResource";
  if (kind === "DependsOn") target.DependsOn = [missing];
  else target.Properties = {
    ...target.Properties, Regression: {
      [kind]: kind === "Fn::GetAtt" ? [missing, "Arn"] : kind === "Fn::Sub" ? `arn:\${${missing}.Arn}` : missing,
    },
  };
  expect(() => assertReferenceClosure(broken)).toThrow(/Dangling/);
});

it("detects an undeclared nested parameter in a real parent template", () => {
  const broken = structuredClone(bootstrap);
  const nested = allResources(broken).find((r) => r.Type === "AWS::CloudFormation::Stack")!;
  nested.Properties!.Parameters = { ...(nested.Properties!.Parameters as object), RemovedParameter: "value" };
  expect(() => assertReferenceClosure(broken)).toThrow("Unknown nested parameter");
});

it("detects a removed nested output even though the referenced stack still exists", () => {
  const broken = structuredClone(bootstrap);
  for (const template of Object.values(broken.templates)) {
    const entry = Object.entries(template.Resources).find(([, r]) => r.Type === "AWS::CloudFormation::Stack");
    if (!entry) continue;
    template.Outputs = { ...template.Outputs, Regression: { Value: { "Fn::GetAtt": [entry[0], "Outputs.RemovedOutput"] } } };
    break;
  }
  expect(() => assertReferenceClosure(broken)).toThrow("Missing nested output");
});


it("grants only the expiring administrator test-mail capability while retaining all preview guards", () => {
  assertReferenceClosure(adminLogin);
  const resources = allResources(adminLogin);
  const statements = resources.filter((r) => r.Type === "AWS::IAM::Policy")
    .flatMap((r) => (r.Properties!.PolicyDocument as { Statement: Record<string, unknown>[] }).Statement);
  const sends = statements.filter((s) => JSON.stringify(s.Action).includes("ses:Send"));
  expect(sends).toHaveLength(1);
  expect(sends[0]).toMatchObject({ Action: "ses:SendEmail", Resource: [
    "arn:aws:ses:us-east-1:743917687359:identity/pestbuzzkill.com",
    "arn:aws:ses:us-east-1:743917687359:configuration-set/buzzkill-migration-preview-test",
  ], Condition: { StringEquals: { "ses:FromAddress": "info@pestbuzzkill.com" }, "ForAllValues:StringEquals": { "ses:Recipients": ["owner@example.com"] } } });
  expect((sends[0].Condition as Record<string, unknown>).DateLessThan).toBeDefined();
  const enabled = resources.filter((r) => r.Type === "AWS::Lambda::Function").filter((r) => (JSON.stringify(r.Properties?.Environment) ?? "").includes('"BUZZKILL_PREVIEW_ADMIN_LOGIN":"true"'));
  expect(enabled).toHaveLength(1);
  // Literal identity bindings avoid trigger -> pool/client -> trigger cycles.
  expect((enabled[0].Properties?.Environment as { Variables: Record<string, unknown> }).Variables).toMatchObject({
    BUZZKILL_PREVIEW_AUTH_POOL_ID: "us-east-1_NT4TiB2DQ",
    BUZZKILL_PREVIEW_AUTH_CLIENT_ID: "5l5rqjoeenmp16h7i0pk1m8h20",
  });
  for (const resolver of resources.filter((r) => r.Type === "AWS::AppSync::Resolver" && r.Properties?.TypeName === "Mutation")) expect(resolver.Properties?.RequestMappingTemplate).toBe(PREVIEW_MUTATION_REFUSAL);
  expect(resources.filter((r) => r.Type === "AWS::Events::Rule")).toHaveLength(0);
});


it("keeps destination stateful identities and properties when the retained backend becomes live", () => {
  assertReferenceClosure(released);
  const stateful = new Set(["Custom::AmplifyDynamoDBTable", "AWS::S3::Bucket", "AWS::Cognito::UserPool", "AWS::Cognito::UserPoolClient", "AWS::Cognito::IdentityPool", "AWS::Backup::BackupVault"]);
  let checked = 0;
  for (const [name, template] of Object.entries(full.templates)) {
    for (const [id, before] of Object.entries(template.Resources)) {
      if (!stateful.has(before.Type)) continue;
      const after = released.templates[name]?.Resources[id];
      expect(after, `${name}:${id} must retain its logical identity`).toBeDefined();
      const left = structuredClone(before), right = structuredClone(after!);
      if (before.Type === "AWS::Cognito::UserPool") {
        // Production intentionally removes only the preview's native-mail
        // refusal trigger. Its identity and all other auth settings stay.
        delete (left.Properties!.LambdaConfig as Record<string, unknown>).CustomMessage;
        expect(right.Properties!.LambdaConfig).not.toHaveProperty("CustomMessage");
      }
      expect(right, `${name}:${id} must preserve stateful properties`).toEqual(left);
      checked++;
    }
  }
  expect(checked).toBe(62);
});


it("binds destination release provider secrets to every intended consumer while preview keeps them absent", () => {
  const functions = (assembly: Assembly) => allResources(assembly).filter((r) => r.Type === "AWS::Lambda::Function");
  for (const [key, expected] of [["GOOGLE_ROUTES_API_KEY", 7], ["ANTHROPIC_API_KEY", 2]] as const) {
    const consumers = functions(released).filter((r) => (JSON.stringify(r.Properties?.Environment) ?? "").includes(`\"${key}\"`));
    expect(consumers, key).toHaveLength(expected);
    for (const fn of consumers) {
      const variables = (fn.Properties?.Environment as { Variables: Record<string, string> }).Variables;
      expect(variables[key]).toBe("<value will be resolved during runtime>");
      expect(variables.AMPLIFY_SSM_ENV_CONFIG).toContain(key);
    }
    expect(functions(full).filter((r) => (JSON.stringify(r.Properties?.Environment) ?? "").includes(`\"${key}\"`))).toHaveLength(0);
  }
});


it("keeps release booking CORS confined to the destination's matching environment", () => {
  const envs = allResources(released).filter((r) => r.Type === "AWS::Lambda::Function")
    .map((r) => (r.Properties?.Environment as { Variables?: Record<string, string> })?.Variables ?? {});
  const cors = envs.find((v) => v.BOOKING_CORS_ORIGINS)?.BOOKING_CORS_ORIGINS;
  if (process.env.AWS_BRANCH === "codex-buzzkill-staging-migration") {
    expect(cors?.split(",")).toEqual([
      "https://migration-staging.d3owdoeg1om341.amplifyapp.com",
      "https://migration-staging.d2y2zigtl5rx3.amplifyapp.com",
      "https://staging.pestbuzzkill.com",
    ]);
  } else {
    expect(cors).toBe("https://www.pestbuzzkill.com,https://pestbuzzkill.com");
  }
  expect(cors).not.toMatch(/d26qpsjewk0bee|d5ln2hbbp9s2j|localhost/);
});


it("detects a Cognito trigger referring back to its own pool before deployment", () => {
  const broken = structuredClone(adminLogin);
  const template = Object.values(broken.templates).find((t) => Object.values(t.Resources).some((r) => r.Type === "AWS::Cognito::UserPool"))!;
  const poolId = Object.keys(template.Resources).find((id) => template.Resources[id].Type === "AWS::Cognito::UserPool")!;
  const trigger = Object.values(template.Resources).find((r) => r.Type === "AWS::Lambda::Function" && JSON.stringify(r.Properties?.Environment).includes('"BUZZKILL_PREVIEW_ADMIN_LOGIN":"true"'))!;
  (trigger.Properties!.Environment as { Variables: Record<string, unknown> }).Variables.BUZZKILL_PREVIEW_AUTH_POOL_ID = { Ref: poolId };
  expect(() => assertReferenceClosure(broken)).toThrow("Circular resource dependency");
});


it("deploys a production-configured cutover with every application worker and writer paused", () => {
  assertReferenceClosure(pausedRelease);
  const resources = allResources(pausedRelease);
  expect(resources.filter((r) => r.Type === "AWS::Lambda::EventSourceMapping")).toHaveLength(0);
  const functions = resources.filter((r) => r.Type === "AWS::Lambda::Function");
  expect(functions.filter((r) => r.Properties?.ReservedConcurrentExecutions === 0)).toHaveLength(18);
  const schedules = resources.filter((r) => r.Type === "AWS::Scheduler::Schedule");
  expect(schedules).toHaveLength(3);
  for (const schedule of schedules) expect(schedule.Properties?.State).toBe("DISABLED");
  expect(resources.filter((r) => r.Type === "AWS::SNS::Subscription")).toHaveLength(0);
  for (const r of resources.filter((r) => r.Type === "AWS::SES::ConfigurationSetEventDestination")) {
    expect((r.Properties?.EventDestination as { Enabled: boolean }).Enabled).toBe(false);
  }
  for (const alarm of resources.filter((r) => r.Type === "AWS::CloudWatch::Alarm")) {
    expect(alarm.Properties?.AlarmActions).toBeUndefined();
    expect(alarm.Properties?.OKActions).toBeUndefined();
  }
  const mutations = resources.filter((r) => r.Type === "AWS::AppSync::Resolver" && r.Properties?.TypeName === "Mutation");
  expect(mutations.length).toBeGreaterThan(0);
  expect(mutations).toHaveLength(allResources(released).filter((r) => r.Type === "AWS::AppSync::Resolver" && r.Properties?.TypeName === "Mutation").length);
  for (const resolver of mutations) expect(resolver.Properties?.RequestMappingTemplate).toBe(PREVIEW_MUTATION_REFUSAL);
  const stateful = new Set(["Custom::AmplifyDynamoDBTable", "AWS::S3::Bucket", "AWS::Cognito::UserPool", "AWS::Cognito::UserPoolClient", "AWS::Cognito::IdentityPool", "AWS::Backup::BackupVault"]);
  let checked = 0, functionCount = 0;
  for (const [name, template] of Object.entries(released.templates)) {
    for (const [id, before] of Object.entries(template.Resources)) {
      if (stateful.has(before.Type)) { expect(pausedRelease.templates[name]?.Resources[id], `${name}:${id}`).toEqual(before); checked++; }
      if (before.Type !== "AWS::Lambda::Function") continue;
      const paused = structuredClone(pausedRelease.templates[name]?.Resources[id]);
      expect(paused, `${name}:${id} function identity must remain`).toBeDefined();
      if (paused.Properties) delete paused.Properties.ReservedConcurrentExecutions;
      expect(paused, `${name}:${id} only concurrency may change`).toEqual(before);
      functionCount++;
    }
  }
  expect(checked).toBe(62);
  expect(functionCount).toBe(functions.length);
});
