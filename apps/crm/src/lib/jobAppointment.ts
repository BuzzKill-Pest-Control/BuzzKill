type AppointmentTime = {
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
};

const CLOCK_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Promised appointment times use the shop's clock, regardless of device timezone. */
export function formatJobAppointmentTime(job: AppointmentTime): string {
  const format = (value: string) => {
    const [hour, minute] = value.split(":").map(Number);
    return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
  };
  if (!job.scheduledStartTime || !CLOCK_TIME.test(job.scheduledStartTime)) return "";
  const start = format(job.scheduledStartTime);
  return job.scheduledEndTime && CLOCK_TIME.test(job.scheduledEndTime)
    ? `${start}–${format(job.scheduledEndTime)} ET`
    : `${start} ET`;
}

export function validateJobAppointment(
  date: string,
  start: string,
  end: string
): void {
  if ((start || end) && !date) throw new Error("Choose a date for the appointment time.");
  if (end && !start) throw new Error("Enter a start time before adding an end time.");
  if ((start && !CLOCK_TIME.test(start)) || (end && !CLOCK_TIME.test(end))) {
    throw new Error("Enter a valid appointment time.");
  }
  if (start && end && end <= start) {
    throw new Error("End time must be after start time on the same day.");
  }
}

/** Accept dollars and cents without silently truncating text or rounding extra decimals. */
export function jobPriceCents(value: string, required = false): number | null {
  const dollars = value.trim();
  if (!dollars) {
    if (required) throw new Error("Enter the agreed job amount.");
    return null;
  }
  if (!/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(dollars)) {
    throw new Error("Enter a dollar amount with up to two decimal places.");
  }
  const [whole, fraction = ""] = dollars.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents > 2_147_483_647) {
    throw new Error("The job amount is too large.");
  }
  return cents;
}
