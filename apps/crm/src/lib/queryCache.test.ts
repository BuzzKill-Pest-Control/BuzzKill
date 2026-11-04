import { beforeEach, describe, expect, it, vi } from "vitest";
import { confirmedMutation, createQueryCache, queryCache } from "./queryCache";

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const seed = async () => { await queryCache.request(["customers"], async () => "server rows").promise; };
beforeEach(() => { queryCache.activate(null); queryCache.activate("owner", ["OWNER"]); });

describe("scoped bounded read cache", () => {
  it("shares in-flight reads and preserves the original completion timestamp", async () => {
    let time = 10; const cache = createQueryCache(() => time); cache.activate("a", ["OWNER"]);
    const pending = deferred<string>(), load = vi.fn(() => pending.promise);
    const first = cache.request(["customers", "active"], load), second = cache.request(["customers", "active"], load);
    expect(second.promise).toBe(first.promise); await Promise.resolve(); expect(load).toHaveBeenCalledTimes(1);
    time = 20; pending.resolve("rows"); await first.promise; time = 500;
    expect(cache.read(["customers", "active"])).toEqual({ data: "rows", fetchedAt: 20 });
    expect(cache.read(["customers", "inactive"])).toBeNull();
  });
  it("keeps equivalent groups stable but clears on account or permission changes", async () => {
    const cache = createQueryCache(); cache.activate("a", ["OWNER", "TECH"]);
    await cache.request(["leads"], async () => "private").promise;
    const before = cache.scope(); cache.activate("a", ["TECH", "OWNER", "OWNER"]);
    expect(cache.scope()).toBe(before); expect(cache.read(["leads"])?.data).toBe("private");
    cache.activate("a", ["TECH"]); expect(cache.read(["leads"])).toBeNull();
    cache.activate("b", ["TECH"]); expect(cache.scope()).not.toBe(before);
  });
  it("fences an old request across logout and login to the same account", async () => {
    const cache = createQueryCache(); cache.activate("a"); const before = cache.scope();
    const old = deferred<string>(), request = cache.request(["leads"], () => old.promise);
    cache.activate(null); cache.activate("a"); expect(cache.scope()).not.toBe(before);
    await cache.request(["leads"], async () => "new session").promise;
    old.resolve("old session"); await request.promise;
    expect(request.current()).toBe(false); expect(cache.read(["leads"])?.data).toBe("new session");
  });
  it("renews read generations while preserving the continuing account's write epoch", async () => {
    const cache = createQueryCache(); cache.activate("a", ["OWNER"]);
    const scope = cache.writeScope(), before = cache.scope();
    const old = deferred<string>(), request = cache.request(["leads"], () => old.promise);
    cache.renew(); expect(cache.identity()).toBeNull(); expect(cache.scope()).not.toBe(before); expect(cache.writeScope()).toBe(scope);
    cache.activate("a", ["TECH"]); expect(cache.writeScope()).toBe(scope);
    await cache.request(["leads"], async () => "renewed").promise; old.resolve("old claims"); await request.promise;
    expect(request.current()).toBe(false); expect(cache.read(["leads"])?.data).toBe("renewed");
    cache.renew(); cache.activate(null); cache.activate("a", ["TECH"]);
    expect(cache.writeScope()).not.toBe(scope);
  });
  it("bounds retained and pending entries and expires idle data", async () => {
    let time = 0; const cache = createQueryCache(() => time); cache.activate("a");
    for (let i = 0; i < 21; i++) { time++; await cache.request(["schedule", i], async () => i).promise; }
    expect(cache.read(["schedule", 0])).toBeNull(); expect(cache.read(["schedule", 20])?.data).toBe(20);
    time += 300_000; expect(cache.read(["schedule", 20])).toBeNull();
    const pending = Array.from({ length: 21 }, () => deferred<number>());
    const requests = pending.map((d, i) => cache.request(["leads", i], () => d.promise));
    expect(requests[0].current()).toBe(false);
    await cache.request(["leads", 0], async () => 100).promise;
    pending.forEach((d, i) => d.resolve(i)); await Promise.all(requests.map((r) => r.promise));
    expect(cache.read(["leads", 0])?.data).toBe(100);
  });
  it("invalidates only selected resources and fences pending stale results", async () => {
    const cache = createQueryCache(); cache.activate("a");
    await cache.request(["customers"], async () => "customers").promise;
    const old = deferred<string>(), request = cache.request(["schedule", 1], () => old.promise);
    cache.invalidate(["schedule"]); await cache.request(["schedule", 1], async () => "current").promise;
    old.resolve("stale"); await request.promise;
    expect(request.current()).toBe(false); expect(cache.read(["schedule", 1])?.data).toBe("current");
    expect(cache.read(["customers"])?.data).toBe("customers");
  });
  it("does not retain failed reads or prevent a retry", async () => {
    const cache = createQueryCache(); cache.activate("a");
    await expect(cache.request(["leads"], async () => { throw new Error("offline"); }).promise).rejects.toThrow("offline");
    expect(cache.read(["leads"])).toBeNull();
    await cache.request(["leads"], async () => "recovered").promise; expect(cache.read(["leads"])?.data).toBe("recovered");
  });
});

describe("explicit write invalidation", () => {
  it("waits for the server without fabricating optimistic state", async () => {
    await seed(); const write = deferred<{ data: { id: string } }>(); const result = confirmedMutation(write.promise);
    expect(queryCache.read(["customers"])?.data).toBe("server rows");
    write.resolve({ data: { id: "paid" } }); await result; expect(queryCache.read(["customers"])).toBeNull();
  });
  it.each([{ refused: "disabled" }, JSON.stringify({ refused: "disabled" })])("leaves explicit domain refusals for their caller", async (data) => {
    await seed(); const response = { data }; expect(await confirmedMutation(Promise.resolve(response))).toBe(response);
    expect(queryCache.read(["customers"])?.data).toBe("server rows");
  });
  it("rethrows transport and GraphQL failures, invalidating uncertain server effects", async () => {
    await seed(); await expect(confirmedMutation(Promise.reject(new Error("connection lost")))).rejects.toThrow("connection lost");
    expect(queryCache.read(["customers"])).toBeNull(); await seed();
    await expect(confirmedMutation(Promise.resolve({ data: { id: "partial" }, errors: [{ message: "denied" }] }))).rejects.toThrow("denied");
    expect(queryCache.read(["customers"])).toBeNull();
  });
  it.each([null, { ok: false, error: "refused without atomic guarantee" }, "malformed JSON"])("does not relabel ambiguous payloads as success", async (data) => {
    await seed(); const response = { data }; expect(await confirmedMutation(Promise.resolve(response))).toBe(response);
    expect(queryCache.read(["customers"])).toBeNull();
  });
  it("does not let an old write clear a new login with the same subject", async () => {
    const pending = deferred<{ data: null }>(), write = confirmedMutation(pending.promise);
    queryCache.activate(null); queryCache.activate("owner", ["OWNER"]); await seed();
    pending.resolve({ data: null }); await write;
    expect(queryCache.read(["customers"])?.data).toBe("server rows");
  });
  it.each(["success", "graphql", "network", "ambiguous"])("invalidates a post-renewal pre-write read after the pending write's %s response", async (outcome) => {
    const pending = deferred<{ data: unknown; errors?: { message: string }[] }>();
    const write = confirmedMutation(pending.promise).then((value) => ({ value }), (error) => ({ error }));
    queryCache.renew(); queryCache.activate("owner", ["TECH"]); await seed();
    expect(queryCache.read(["customers"])?.data).toBe("server rows");
    if (outcome === "network") pending.reject(new Error("connection lost"));
    else pending.resolve(outcome === "graphql" ? { data: { id: "partial" }, errors: [{ message: "partial failure" }] }
      : { data: outcome === "ambiguous" ? null : { id: "saved" } });
    const result = await write;
    expect("error" in result).toBe(outcome === "network" || outcome === "graphql");
    expect(queryCache.read(["customers"])).toBeNull();
  });
  it("fences logout while the read scope is already paused for renewal", async () => {
    const pending = deferred<{ data: null }>(), write = confirmedMutation(pending.promise);
    queryCache.renew(); expect(queryCache.identity()).toBeNull();
    queryCache.activate(null); queryCache.activate("owner", ["OWNER"]); await seed();
    pending.resolve({ data: null }); await write;
    expect(queryCache.read(["customers"])?.data).toBe("server rows");
  });
});
