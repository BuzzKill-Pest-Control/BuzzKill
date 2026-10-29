import { describe, expect, it } from "vitest";
import {
  isWithinBusinessHours,
  nextBusinessOpen,
  nextContactPhrase,
} from "./businessHours";

// All fixtures are July 2026 (EDT = UTC-4). Weekdays verified:
// 2026-07-14 Tue, 07-15 Wed, 07-17 Fri, 07-18 Sat, 07-20 Mon.
const TUE_10AM = new Date("2026-07-14T14:00:00Z"); // 10:00 ET, open
const TUE_7PM = new Date("2026-07-14T23:00:00Z"); // 19:00 ET, after close
const WED_6AM = new Date("2026-07-15T10:00:00Z"); // 06:00 ET, before open
const FRI_7PM = new Date("2026-07-17T23:00:00Z"); // 19:00 ET, after close
const SAT_10AM = new Date("2026-07-18T14:00:00Z"); // 10:00 ET, weekend

describe("business hours (GL-03)", () => {
  it("is open only Mon–Fri during the window", () => {
    expect(isWithinBusinessHours(TUE_10AM)).toBe(true);
    expect(isWithinBusinessHours(TUE_7PM)).toBe(false);
    expect(isWithinBusinessHours(WED_6AM)).toBe(false);
    expect(isWithinBusinessHours(SAT_10AM)).toBe(false);
  });

  it("promises the APPROVED one-business-day commitment, naming the real day", () => {
    // GL-03: no hourly promise exists — one business day, every source.
    expect(nextContactPhrase(TUE_10AM, new Date("2026-07-15T14:00:00Z")))
      .toBe("within one business day (by tomorrow)");
    expect(nextContactPhrase(FRI_7PM, new Date("2026-07-22T12:00:00Z")))
      .toBe("within one business day (by Wednesday)");
  });

  it("computes the next open instant, skipping the weekend", () => {
    expect(nextBusinessOpen(TUE_10AM).toISOString()).toBe("2026-07-14T14:00:00.000Z"); // already open
    expect(nextBusinessOpen(WED_6AM).toISOString()).toBe("2026-07-15T12:00:00.000Z"); // today 8am ET
    expect(nextBusinessOpen(TUE_7PM).toISOString()).toBe("2026-07-15T12:00:00.000Z"); // Wed 8am ET
    expect(nextBusinessOpen(FRI_7PM).toISOString()).toBe("2026-07-20T12:00:00.000Z"); // Mon 8am ET
    expect(nextBusinessOpen(SAT_10AM).toISOString()).toBe("2026-07-20T12:00:00.000Z"); // Mon 8am ET
  });
});
