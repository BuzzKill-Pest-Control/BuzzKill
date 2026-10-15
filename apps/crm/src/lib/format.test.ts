import { afterEach, describe, expect, it, vi } from "vitest";
import { addDays, startOfWeek } from "./format";

describe.each(["UTC", "America/New_York", "Pacific/Auckland", "Pacific/Kiritimati"])(
  "calendar navigation in %s",
  (timeZone) => {
    afterEach(() => vi.unstubAllEnvs());

    it("keeps Today on the selected calendar date and moves one day at a time", () => {
      vi.stubEnv("TZ", timeZone);
      expect(addDays("2026-10-14", 0)).toBe("2026-10-14");
      expect(addDays("2026-10-14", 1)).toBe("2026-10-15");
      expect(addDays("2026-10-14", -1)).toBe("2026-10-13");
    });

    it("keeps the schedule on Monday when moving to the next week", () => {
      vi.stubEnv("TZ", timeZone);
      const monday = startOfWeek("2026-10-14");
      expect(monday).toBe("2026-10-12");
      expect(addDays(monday, 7)).toBe("2026-10-19");
    });

    it("crosses month, leap-day, and daylight-saving boundaries by calendar day", () => {
      vi.stubEnv("TZ", timeZone);
      expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
      expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
      expect(addDays("2026-03-07", 2)).toBe("2026-03-09");
      expect(addDays("2026-10-31", 2)).toBe("2026-11-02");
    });
  },
);

describe("startOfWeek — Monday of the containing week", () => {
  it("returns the same day when the date is already a Monday", () => {
    // 2026-07-20 is a Monday.
    expect(startOfWeek("2026-07-20")).toBe("2026-07-20");
  });

  it("maps every weekday back to its Monday", () => {
    // Mon 2026-07-20 … Sun 2026-07-26 all belong to the week of the 20th.
    for (let i = 0; i < 7; i++) {
      expect(startOfWeek(addDays("2026-07-20", i))).toBe("2026-07-20");
    }
  });

  it("treats Sunday as the last day of the week, not the first", () => {
    // 2026-07-26 is a Sunday — its week still starts Monday the 20th.
    expect(startOfWeek("2026-07-26")).toBe("2026-07-20");
    // The next day (Monday the 27th) rolls to the following week.
    expect(startOfWeek("2026-07-27")).toBe("2026-07-27");
  });

  it("crosses a month boundary", () => {
    // 2026-08-01 is a Saturday; its Monday is 2026-07-27.
    expect(startOfWeek("2026-08-01")).toBe("2026-07-27");
  });

  it("crosses a year boundary", () => {
    // 2027-01-01 is a Friday; its Monday is 2026-12-28.
    expect(startOfWeek("2027-01-01")).toBe("2026-12-28");
  });

  it("a full week generated from the start covers Mon…Sun exactly", () => {
    const start = startOfWeek("2026-07-23"); // Thursday
    const week = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    expect(week).toEqual([
      "2026-07-20",
      "2026-07-21",
      "2026-07-22",
      "2026-07-23",
      "2026-07-24",
      "2026-07-25",
      "2026-07-26",
    ]);
  });
});
