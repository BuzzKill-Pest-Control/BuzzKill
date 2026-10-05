import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ send: vi.fn(async () => ({})), data: vi.fn(() => { throw new Error("No business reads"); }), work: vi.fn() }));
vi.mock("@aws-sdk/client-cognito-identity-provider", () => ({ CognitoIdentityProviderClient: class { send = mocks.send; }, AdminUpdateUserAttributesCommand: class { constructor(public input: unknown) {} } }));
vi.mock("../shared/dataClient", () => ({ dataClient: mocks.data }));
vi.mock("../shared/ownedWork", () => ({ openOwnedWork: mocks.work }));
afterEach(() => vi.unstubAllEnvs());
it("preview post-auth stamps only Cognito and does not touch copied Customer rows or owned work", async () => {
  vi.stubEnv("BUZZKILL_MIGRATION_PREVIEW", "true");
  const { handler } = await import("./handler");
  const event = { userPoolId: "us-east-1_synthetic", userName: "synthetic", request: { userAttributes: { sub: "synthetic-sub" } } };
  const invoke = handler as unknown as (event: object) => Promise<unknown>;
  expect(await invoke(event)).toBe(event);
  expect(mocks.send).toHaveBeenCalledOnce(); expect(mocks.data).not.toHaveBeenCalled(); expect(mocks.work).not.toHaveBeenCalled();
});
