import { afterEach, describe, expect, it, vi } from "vitest";
import { driveLegBetween, driveMinutesBetween } from "./driveTime";

/**
 * Leg-failure classification (Aug 2026 incident): a failure must say WHICH
 * kind it is — a bad address holds a day and names the address; a provider
 * problem (key/auth/quota/network) says nothing about any address and must
 * never be allowed to masquerade as one.
 */

const respond = (status: number, body: string) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(body, { status }))
  );

afterEach(() => vi.unstubAllGlobals());

describe("driveLegBetween classification", () => {
  it("a measured route is minutes", async () => {
    respond(200, JSON.stringify({ routes: [{ duration: "1220s" }] }));
    expect(await driveLegBetween("k", "a", "b")).toEqual({ minutes: 20 });
  });

  it("a geocoding 400 naming the origin is ADDRESS_NOT_FOUND(origin)", async () => {
    respond(400, JSON.stringify({ error: { message: "Geocoding failed for: origin" } }));
    expect(await driveLegBetween("k", "a", "b")).toEqual({
      failure: { kind: "ADDRESS_NOT_FOUND", badEndpoint: "origin" },
    });
  });

  it("a geocoding 400 naming the destination blames the destination", async () => {
    respond(400, JSON.stringify({ error: { message: "Address not found: destination waypoint" } }));
    expect(await driveLegBetween("k", "a", "b")).toEqual({
      failure: { kind: "ADDRESS_NOT_FOUND", badEndpoint: "destination" },
    });
  });

  it("an auth failure is PROVIDER_ERROR — never an address's fault", async () => {
    respond(403, JSON.stringify({ error: { message: "API key not valid" } }));
    const r = await driveLegBetween("k", "a", "b");
    expect("failure" in r && r.failure.kind).toBe("PROVIDER_ERROR");
    expect("failure" in r && r.failure.kind === "PROVIDER_ERROR" && r.failure.detail).toContain("403");
  });

  it("quota exhaustion is PROVIDER_ERROR", async () => {
    respond(429, "rate limited");
    const r = await driveLegBetween("k", "a", "b");
    expect("failure" in r && r.failure.kind).toBe("PROVIDER_ERROR");
  });

  it("a network throw is PROVIDER_ERROR", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNRESET");
      })
    );
    const r = await driveLegBetween("k", "a", "b");
    expect("failure" in r && r.failure.kind).toBe("PROVIDER_ERROR");
  });

  it("an empty 200 (no drivable route) reads as address-shaped", async () => {
    respond(200, JSON.stringify({ routes: [] }));
    expect(await driveLegBetween("k", "a", "b")).toEqual({
      failure: { kind: "ADDRESS_NOT_FOUND", badEndpoint: "unknown" },
    });
  });

  it("driveMinutesBetween keeps its null-on-any-failure compat contract", async () => {
    respond(403, "nope");
    expect(await driveMinutesBetween("k", "a", "b")).toBeNull();
    respond(200, JSON.stringify({ routes: [{ duration: "600s" }] }));
    expect(await driveMinutesBetween("k", "a", "b")).toBe(10);
  });
});
