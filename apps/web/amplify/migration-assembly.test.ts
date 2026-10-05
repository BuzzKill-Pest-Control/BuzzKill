import { afterAll, beforeAll, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { PREVIEW_MUTATION_REFUSAL } from "./migration-read-only";

type Resource = { Type: string; Properties?: Record<string, unknown>; [key: string]: unknown };
type Template = {
  Resources: Record<string, Resource>;
  Parameters?: Record<string, { Default?: unknown }>;
  Outputs?: Record<string, unknown>;
};
type Assembly = { templates: Record<string, Template>; assets: Record<string, string> };
const directory = mkdtempSync(join(tmpdir(), "buzzkill-migration-assembly-"));
let full: Assembly;
let bootstrap: Assembly;

function synth(phase: "full" | "bootstrap"): Assembly {
  const outdir = join(directory, phase);
  const branch = process.env.AWS_BRANCH === "codex-buzzkill-staging-migration"
    ? process.env.AWS_BRANCH : "codex-buzzkill-account-migration";
  const result = spawnSync(process.execPath, [
    "--import", "tsx", resolve("scripts/synthMigrationBackend.mts"), outdir, phase, branch,
  ], { cwd: process.cwd(), encoding: "utf8", timeout: 120_000, maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) {
    throw new Error(`Offline ${phase} synthesis failed: ${result.error ?? ""}\n${result.stdout}\n${result.stderr}`);
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
    const checkRef = (id: string) => {
      if (!id.startsWith("AWS::") && !Object.hasOwn(resources, id) && !Object.hasOwn(template.Parameters ?? {}, id)) {
        fail(`Dangling Ref ${id}`);
      }
    };
    const checkAttribute = (id: string, attribute: string) => {
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
  }
}

function allResources(assembly: Assembly) {
  return Object.values(assembly.templates).flatMap((t) => Object.values(t.Resources));
}

beforeAll(() => {
  full = synth("full");
  bootstrap = synth("bootstrap");
}, 240_000);
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
