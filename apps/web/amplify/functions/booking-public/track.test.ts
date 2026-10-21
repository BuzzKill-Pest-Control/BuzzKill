import { describe, expect, it, vi } from "vitest";
import { decideTrackStatus, handler } from "./handler";

const listJobByTrackToken = vi.fn();
vi.mock("../shared/dataClient", () => ({
  dataClient: async () => ({ models: { Job: { listJobByTrackToken } } }),
}));

async function track() {
  const result = await handler({
    headers: {},
    requestContext: { http: { method: "POST", path: "/track" } },
    body: JSON.stringify({ token: "test-tracking-token" }),
    isBase64Encoded: false,
  } as never) as { statusCode: number; body: string };
  return { status: result.statusCode, body: JSON.parse(result.body) };
}

describe("tracking lookup", () => {
  it("returns a retryable failure when the job query reports GraphQL errors", async () => {
    listJobByTrackToken.mockResolvedValueOnce({
      data: null,
      errors: [{ message: "Test query failure" }],
    });

    const result = await track();
    expect(result.status).toBe(503);
    expect(result.body).toEqual({ error: expect.any(String) });
    expect(result.body.error).not.toContain("Test query failure");
  });

  it("ends tracking when a successful lookup finds no matching job", async () => {
    listJobByTrackToken.mockResolvedValueOnce({ data: [], errors: [] });

    expect(await track()).toEqual({ status: 200, body: { status: "UNKNOWN" } });
  });
});

/**
 * "On My Way" live tracking only broadcasts while a visit is genuinely en
 * route. decideTrackStatus is the guard the public endpoint runs before it
 * returns any location — these lock down each terminal case so a stale token
 * can never leak a technician's whereabouts.
 */
const NOW = "2026-07-23T18:00:00.000Z";

describe("decideTrackStatus", () => {
  it("EN_ROUTE while scheduled, en route, and within the TTL", () => {
    expect(
      decideTrackStatus(
        {
          enRouteAt: "2026-07-23T17:50:00.000Z",
          status: "SCHEDULED",
          trackEndsAt: "2026-07-23T20:50:00.000Z",
        },
        NOW
      )
    ).toBe("EN_ROUTE");
  });

  it("UNKNOWN when the token matches nothing", () => {
    expect(decideTrackStatus(null, NOW)).toBe("UNKNOWN");
  });

  it("UNKNOWN when the tech never tapped On My Way", () => {
    expect(
      decideTrackStatus({ enRouteAt: null, status: "SCHEDULED" }, NOW)
    ).toBe("UNKNOWN");
  });

  it("ARRIVED once the visit starts (IN_PROGRESS) — stops sharing at the door", () => {
    expect(
      decideTrackStatus(
        { enRouteAt: "2026-07-23T17:50:00.000Z", status: "IN_PROGRESS" },
        NOW
      )
    ).toBe("ARRIVED");
  });

  it("ARRIVED for any terminal status (completed / no-access / canceled)", () => {
    for (const status of ["COMPLETED", "NO_ACCESS", "CANCELED"]) {
      expect(
        decideTrackStatus(
          { enRouteAt: "2026-07-23T17:50:00.000Z", status },
          NOW
        )
      ).toBe("ARRIVED");
    }
  });

  it("ENDED once the safety TTL has passed — a forgotten session cannot broadcast forever", () => {
    expect(
      decideTrackStatus(
        {
          enRouteAt: "2026-07-23T14:00:00.000Z",
          status: "SCHEDULED",
          trackEndsAt: "2026-07-23T17:00:00.000Z",
        },
        NOW
      )
    ).toBe("ENDED");
  });
});
