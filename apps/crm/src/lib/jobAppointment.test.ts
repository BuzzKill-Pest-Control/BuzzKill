import { describe, expect, it } from "vitest";
import { formatJobAppointmentTime, jobPriceCents, validateJobAppointment } from "./jobAppointment";

describe("manual job amount", () => {
  it("preserves exact cents, including small amounts and an explicit free job", () => {
    expect(jobPriceCents("149.99", true)).toBe(14999);
    expect(jobPriceCents(" 250 ", true)).toBe(25000);
    expect(jobPriceCents(".50", true)).toBe(50);
    expect(jobPriceCents("0", true)).toBe(0);
  });

  it("requires an agreed amount for leads while allowing existing draft jobs", () => {
    expect(() => jobPriceCents(" ", true)).toThrow("agreed job amount");
    expect(jobPriceCents("")).toBeNull();
  });

  it.each(["149 dollars", "12.345", "1e3", "-1", "NaN", "Infinity", "21474836.48"])(
    "refuses invalid amounts instead of creating a differently priced job: %s",
    (value) => expect(() => jobPriceCents(value, true)).toThrow()
  );
});

describe("manual job appointment", () => {
  it("accepts a specific time, a time window, or a date-only visit", () => {
    expect(() => validateJobAppointment("2026-10-06", "15:30", "16:30")).not.toThrow();
    expect(() => validateJobAppointment("2026-10-06", "15:30", "")).not.toThrow();
    expect(() => validateJobAppointment("2026-10-06", "", "")).not.toThrow();
  });

  it.each([
    ["", "15:30", "16:30"],
    ["2026-10-06", "", "16:30"],
    ["2026-10-06", "16:30", "15:30"],
    ["2026-10-06", "15:30", "15:30"],
    ["2026-10-06", "24:00", ""],
  ])("refuses incomplete or reversed appointments", (date, start, end) => {
    expect(() => validateJobAppointment(date, start, end)).toThrow();
  });

  it("shows the promised Eastern time independently of route estimates", () => {
    expect(formatJobAppointmentTime({ scheduledStartTime: "15:30", scheduledEndTime: "16:30" }))
      .toBe("3:30 PM–4:30 PM ET");
    expect(formatJobAppointmentTime({ scheduledStartTime: "12:00" })).toBe("12:00 PM ET");
    expect(formatJobAppointmentTime({ scheduledStartTime: "00:30" })).toBe("12:30 AM ET");
    expect(formatJobAppointmentTime({})).toBe("");
  });
});
