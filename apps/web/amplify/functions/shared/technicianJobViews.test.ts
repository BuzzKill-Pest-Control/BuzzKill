import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { AppSyncIdentity } from "aws-lambda";
import { buildTechnicianJobView } from "./technicianJobViews";
import type { FieldRow, TechnicianReadStore } from "./technicianReadStore";

let activeStore: TechnicianReadStore;
vi.mock("./technicianReadStore", async (original) => ({
  ...(await original<typeof import("./technicianReadStore")>()),
  technicianReadStore: () => activeStore,
}));

const customerGet = vi.fn();
const licenseRead = vi.fn();
vi.mock("./dataClient", () => ({
  dataClient: async () => ({
    models: {
      Customer: { get: customerGet },
      TechnicianLicense: { listTechnicianLicenseByTechnicianId: licenseRead },
    },
  }),
}));
const identity = (sub = "tech-sub", groups = ["TECH"]) =>
  ({ sub, groups, claims: {} }) as unknown as AppSyncIdentity;
const job = (): FieldRow => ({
  id: "job",
  customerId: "customer",
  technicianId: "tech",
  status: "SCHEDULED",
  packetVersion: 3,
  packetAckVersion: 1,
  priceCents: 100,
  paidPaymentIntentId: "private-payment",
});
function store(): TechnicianReadStore {
  return {
    job: vi.fn(async () => job()),
    report: vi.fn(async () => null),
    reports: vi.fn(async () => []),
    technician: vi.fn(async () => ({
      id: "tech",
      userSub: "tech-sub",
      active: true,
      licenseNumber: "MA-TEST",
      licenseExpiresOn: "2099-01-01",
    })),
    historyPage: vi.fn(async () => ({ rows: [], key: null })),
  };
}
beforeEach(() => {
  customerGet.mockReset().mockResolvedValue({
    data: {
      id: "customer",
      displayName: "Synthetic",
      serviceUnit: "A",
      notes: "private-notes",
      stripeCustomerId: "private-billing",
    },
  });
  licenseRead.mockReset().mockResolvedValue({ data: [], nextToken: null });
});
afterEach(() => vi.restoreAllMocks());

it("dispatches the new AppSync arguments through the existing technicianJob query", async () => {
  activeStore = store();
  vi.mocked(activeStore.report).mockResolvedValueOnce({
    id: "saved",
    jobId: "job",
    customerId: "customer",
    technicianId: "tech",
  });
  const { handler } = await import("../crm-docs/handler");
  const call = (args: Record<string, unknown>) =>
    handler({
      info: { fieldName: "technicianJob" },
      identity: identity(),
      arguments: { jobId: "job", ...args },
    } as never);
  expect(await call({ view: "CURRENT", reportId: "saved" })).toMatchObject({
    currentOnly: true,
    reports: [{ id: "saved" }],
  });
  expect(activeStore.report).toHaveBeenCalledWith("saved");
  expect(await call({ view: "HISTORY", historyLimit: 2 })).toMatchObject({
    historyPage: true,
    priorVisits: [],
    historyNextToken: null,
  });
  expect(activeStore.historyPage).toHaveBeenCalledWith("customer", null, 2);
  await expect(
    call({ view: "HISTORY", historyToken: "bad-token" }),
  ).rejects.toThrow(/continuation/);
});

it("CURRENT proves fresh assignment and licence once, without full history/catalog reads", async () => {
  const io = store();
  const result = await buildTechnicianJobView(
    identity(),
    "job",
    { view: "CURRENT" },
    io,
  );
  expect(result).toMatchObject({
    currentOnly: true,
    historyAllowed: true,
    packetChanged: true,
    job: { id: "job" },
    customer: { serviceUnit: "A" },
  });
  expect(result).not.toHaveProperty("catalog");
  expect(result).not.toHaveProperty("priorVisits");
  expect(io.technician).toHaveBeenCalledOnce();
  expect(licenseRead).toHaveBeenCalledOnce();
  expect(io.historyPage).not.toHaveBeenCalled();
  expect(JSON.stringify(result)).not.toMatch(
    /priceCents|paidPaymentIntentId|private-|licenseNumber/,
  );
  vi.mocked(io.job).mockResolvedValueOnce({
    ...job(),
    technicianId: "someone-else",
  });
  await expect(
    buildTechnicianJobView(identity(), "job", { view: "CURRENT" }, io),
  ).rejects.toThrow("Not authorized for this job");
  expect(io.technician).toHaveBeenCalledTimes(2);
});

it.each(["CURRENT", "HISTORY"])(
  "%s keeps inactive, lapsed, nonstaff and missing-job reads closed",
  async (view) => {
    const io = store();
    vi.mocked(io.technician).mockResolvedValueOnce({
      id: "tech",
      active: false,
    });
    await expect(
      buildTechnicianJobView(identity(), "job", { view }, io),
    ).rejects.toThrow("Not authorized for this job");
    vi.mocked(io.technician).mockResolvedValueOnce({
      id: "tech",
      active: true,
      licenseExpiresOn: "2000-01-01",
    });
    await expect(
      buildTechnicianJobView(identity(), "job", { view }, io),
    ).rejects.toThrow("Not authorized for this job");
    await expect(
      buildTechnicianJobView(
        identity("customer", ["CUSTOMER"]),
        "job",
        { view },
        io,
      ),
    ).rejects.toThrow("Not authorized for technician records");
    vi.mocked(io.job).mockResolvedValueOnce(null);
    await expect(
      buildTechnicianJobView(identity(), "missing", { view }, io),
    ).rejects.toThrow("Not authorized for this job");
    expect(customerGet).not.toHaveBeenCalled();
    expect(io.historyPage).not.toHaveBeenCalled();
  },
);

it("a lapsed technician sees only their own completed reports and no other visit history", async () => {
  const io = store();
  vi.mocked(io.job).mockResolvedValue({ ...job(), status: "COMPLETED" });
  vi.mocked(io.technician).mockResolvedValue({
    id: "tech",
    active: true,
    licenseExpiresOn: "2000-01-01",
  });
  vi.mocked(io.reports).mockResolvedValue([
    { id: "own", jobId: "job", customerId: "customer", technicianId: "tech" },
    {
      id: "other",
      jobId: "job",
      customerId: "customer",
      technicianId: "other",
    },
  ]);
  expect(
    await buildTechnicianJobView(identity(), "job", { view: "CURRENT" }, io),
  ).toMatchObject({ historyAllowed: false, reports: [{ id: "own" }] });
  expect(
    await buildTechnicianJobView(identity(), "job", { view: "HISTORY" }, io),
  ).toEqual({
    historyPage: true,
    historyAllowed: false,
    priorVisits: [],
    historyNextToken: null,
  });
  expect(io.historyPage).not.toHaveBeenCalled();
});

it("preserves empty history continuation, includes undated visits, and binds tokens to caller/job/customer", async () => {
  const io = store();
  vi.mocked(io.historyPage).mockResolvedValueOnce({
    rows: [],
    key: { id: "examined", customerId: "customer" },
  });
  const first = await buildTechnicianJobView(
    identity(),
    "job",
    { view: "HISTORY", historyLimit: 2 },
    io,
  );
  if (!("historyPage" in first)) throw new Error("Wrong view");
  expect(first).toMatchObject({
    priorVisits: [],
    historyNextToken: expect.any(String),
  });
  vi.mocked(io.historyPage).mockResolvedValueOnce({
    rows: [
      { id: "undated", customerId: "customer", status: "CANCELED" },
      { id: "foreign", customerId: "other" },
    ],
    key: null,
  });
  expect(
    await buildTechnicianJobView(
      identity(),
      "job",
      { view: "HISTORY", historyToken: first.historyNextToken },
      io,
    ),
  ).toMatchObject({
    priorVisits: [{ id: "undated", scheduledDate: null }],
    historyNextToken: null,
  });
  await expect(
    buildTechnicianJobView(
      identity("owner", ["OWNER"]),
      "job",
      { view: "HISTORY", historyToken: first.historyNextToken },
      io,
    ),
  ).rejects.toThrow(/continuation/);
  vi.mocked(io.job).mockResolvedValueOnce({ ...job(), customerId: "changed" });
  await expect(
    buildTechnicianJobView(
      identity(),
      "job",
      { view: "HISTORY", historyToken: first.historyNextToken },
      io,
    ),
  ).rejects.toThrow(/continuation/);
  vi.mocked(io.job).mockResolvedValueOnce({ ...job(), id: "another-job" });
  await expect(
    buildTechnicianJobView(
      identity(),
      "another-job",
      { view: "HISTORY", historyToken: first.historyNextToken },
      io,
    ),
  ).rejects.toThrow(/continuation/);
});

it("hydrates only same-customer finalized findings and caps report concurrency at three", async () => {
  const io = store();
  let active = 0,
    maximum = 0;
  vi.mocked(io.historyPage).mockResolvedValueOnce({
    rows: Array.from({ length: 8 }, (_, n) => ({
      id: `prior-${n}`,
      customerId: "customer",
      status: "COMPLETED",
    })),
    key: null,
  });
  vi.mocked(io.reports).mockImplementation(async (id) => {
    active++;
    maximum = Math.max(maximum, active);
    await new Promise((resolve) => setTimeout(resolve, 0));
    active--;
    return [
      {
        id: `report-${id}`,
        jobId: id,
        customerId: "other",
        status: "FINALIZED",
        techNotes: "private",
      },
    ];
  });
  const result = await buildTechnicianJobView(
    identity(),
    "job",
    { view: "HISTORY" },
    io,
  );
  if (!("historyPage" in result)) throw new Error("Wrong view");
  expect(result.priorVisits).toHaveLength(8);
  expect(maximum).toBe(3);
  expect(result.priorVisits.every((row) => row.findings === null)).toBe(true);
  expect(JSON.stringify(result)).not.toContain("private");
});

it("refreshes a saved report by ID before its job GSI catches up, refusing foreign context", async () => {
  const io = store();
  vi.mocked(io.report).mockResolvedValueOnce({
    id: "saved",
    jobId: "job",
    customerId: "customer",
    technicianId: "tech",
    status: "FINALIZED",
  });
  expect(
    await buildTechnicianJobView(
      identity(),
      "job",
      { view: "CURRENT", reportId: "saved" },
      io,
    ),
  ).toMatchObject({ reports: [{ id: "saved" }], currentOnly: true });
  expect(io.report).toHaveBeenCalledWith("saved");
  expect(io.reports).not.toHaveBeenCalled();
  vi.mocked(io.report).mockResolvedValueOnce({
    id: "saved",
    jobId: "other",
    customerId: "private",
    technicianId: "other",
  });
  const denied = await buildTechnicianJobView(
    identity(),
    "job",
    { view: "CURRENT", reportId: "saved" },
    io,
  );
  expect(denied).toMatchObject({ reports: [], reportsUnavailable: true });
  expect(JSON.stringify(denied)).not.toContain("private");
});

it("marks source failures unavailable without returning provider details or advancing history", async () => {
  const io = store();
  customerGet.mockRejectedValueOnce(new Error("private customer failure"));
  vi.mocked(io.reports).mockRejectedValueOnce(
    new Error("private report failure"),
  );
  const result = await buildTechnicianJobView(
    identity(),
    "job",
    { view: "CURRENT" },
    io,
  );
  expect(result).toMatchObject({
    customerUnavailable: true,
    reportsUnavailable: true,
  });
  expect(JSON.stringify(result)).not.toContain("private");
  vi.mocked(io.historyPage).mockRejectedValueOnce(
    new Error("unverified history"),
  );
  await expect(
    buildTechnicianJobView(identity(), "job", { view: "HISTORY" }, io),
  ).rejects.toThrow("unverified history");
});

it.each([
  { view: "OTHER" },
  { historyLimit: 2 },
  { view: "CURRENT", historyToken: "x" },
  { view: "HISTORY", historyLimit: 21 },
  { view: "HISTORY", reportId: "x" },
  { view: "CURRENT", reportId: "" },
])("rejects invalid explicit-view arguments before reads %o", async (args) => {
  const io = store();
  await expect(
    buildTechnicianJobView(identity(), "job", args, io),
  ).rejects.toThrow();
  expect(io.job).not.toHaveBeenCalled();
});
