import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { queryCache } from "./queryCache";
import { readPaymentMethodSummary } from "./paymentMethodSummary";

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const key = ["customers", "ACTIVE"] as const;
async function seed() {
  await queryCache.request(key, async () => [{ id: "customer", paymentMethodLabel: "Visa ••1111" }]).promise;
  await queryCache.request(["schedule"], async () => "unrelated").promise;
}
beforeEach(async () => { queryCache.activate(null); queryCache.activate("owner", ["OWNER"]); await seed(); });
afterEach(() => queryCache.activate(null));
describe("payment summary's explicit repair boundary", () => {
  it.each([false, true])("invalidates only customers after an authoritative changed label (AWSJSON=%s)", async (json) => {
    const pending = deferred<{ data: unknown }>(), request = readPaymentMethodSummary(pending.promise, "Visa ••1111");
    expect(queryCache.read(key)?.data).toEqual([{ id: "customer", paymentMethodLabel: "Visa ••1111" }]);
    const value = { hasPaymentMethod: true, label: "Visa ••4242" }, response = { data: json ? JSON.stringify(value) : value };
    pending.resolve(response); expect(await request).toBe(response);
    expect(queryCache.read(key)).toBeNull(); expect(queryCache.read(["schedule"])?.data).toBe("unrelated");
  });
  it("preserves a fresh directory and its original timestamp for an unchanged summary", async () => {
    const before = queryCache.read(key);
    await readPaymentMethodSummary(Promise.resolve({ data: JSON.stringify({ hasPaymentMethod: true, label: "Visa ••1111" }) }), "Visa ••1111");
    expect(queryCache.read(key)).toEqual(before);
  });
  it("does not infer a server-side clearing from no saved method", async () => {
    const before = queryCache.read(key);
    await readPaymentMethodSummary(Promise.resolve({ data: { hasPaymentMethod: false, label: null } }), "Visa ••1111");
    expect(queryCache.read(key)).toEqual(before);
  });
  it.each([null, "invalid JSON", { hasPaymentMethod: true, label: null }, { error: "partial repair" }])("invalidates uncertain payloads without inventing a cleared/repaired value: %o", async (data) => {
    const response = { data }; expect(await readPaymentMethodSummary(Promise.resolve(response), "Visa ••1111")).toBe(response);
    expect(queryCache.read(key)).toBeNull();
  });
  it("keeps GraphQL partial failures for caller handling and rethrows the original transport failure", async () => {
    const response = { data: { hasPaymentMethod: true, label: "Visa ••1111" }, errors: [{ message: "partial" }] };
    expect(await readPaymentMethodSummary(Promise.resolve(response), "Visa ••1111")).toBe(response); expect(queryCache.read(key)).toBeNull();
    await seed(); const failure = new Error("connection lost");
    await expect(readPaymentMethodSummary(Promise.reject(failure), "Visa ••1111")).rejects.toBe(failure);
    expect(queryCache.read(key)).toBeNull();
  });
  it("invalidates post-renewal customer reads for the continuing login", async () => {
    const pending = deferred<{ data: unknown }>(), request = readPaymentMethodSummary(pending.promise, "Visa ••1111");
    queryCache.renew(); queryCache.activate("owner", ["TECH"]); await seed();
    pending.resolve({ data: { hasPaymentMethod: true, label: "Visa ••4242" } }); await request;
    expect(queryCache.read(key)).toBeNull();
  });
  it.each(["success", "failure"])("does not let an old login's %s invalidate a new same-sub login", async (outcome) => {
    const pending = deferred<{ data: unknown }>();
    const request = readPaymentMethodSummary(pending.promise, "Visa ••1111").catch(() => null);
    queryCache.renew(); queryCache.activate(null); queryCache.activate("owner", ["OWNER"]); await seed();
    if (outcome === "failure") pending.reject(new Error("connection lost"));
    else pending.resolve({ data: { hasPaymentMethod: true, label: "Visa ••4242" } });
    await request; expect(queryCache.read(key)?.data).toEqual([{ id: "customer", paymentMethodLabel: "Visa ••1111" }]);
  });
});
