import { describe, expect, it } from "vitest";
import { renderQuotePdf } from "./pdf";

const isPdf = (bytes: Uint8Array) =>
  Buffer.from(bytes.slice(0, 5)).toString("latin1") === "%PDF-";

const base = {
  quoteRef: "bk-abc123",
  quotedAtIso: "2026-07-20T15:00:00.000Z",
  validThroughIso: "2026-07-21T15:00:00.000Z",
  customerName: "Dana Rivera",
  customerEmail: "dana@example.com",
  customerPhone: "(413) 555-0123",
  serviceAddress: "12 Maple St, Springfield, MA 01103",
};

describe("renderQuotePdf", () => {
  it("renders a one-time-only quote (no plan offer)", async () => {
    const pdf = await renderQuotePdf({
      ...base,
      serviceLabel: "Wasp nest removal",
      serviceId: "WASP_NEST",
      oneTimeCents: 24900,
      plan: null,
    });
    expect(isPdf(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it("renders a one-time treatment with a recurring plan option", async () => {
    const pdf = await renderQuotePdf({
      ...base,
      serviceLabel: "General pest control",
      serviceId: "GENERAL_PEST",
      oneTimeCents: 18900,
      plan: { frequency: "QUARTERLY", monthlyCents: 4900, initialFeeCents: 4900 },
    });
    expect(isPdf(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it("renders a plan-only quote with no one-time box", async () => {
    const pdf = await renderQuotePdf({
      ...base,
      serviceLabel: "Community common-area plan — 24 units",
      serviceId: "HOA_COMMON_AREA",
      oneTimeCents: 4200, // present but must be ignored under planOnly
      plan: { frequency: "MONTHLY", monthlyCents: 42000, initialFeeCents: 42000 },
      planOnly: true,
    });
    expect(isPdf(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it("renders an off-season seasonal enrollment (no day board)", async () => {
    const pdf = await renderQuotePdf({
      ...base,
      serviceLabel: "Mosquito plan",
      serviceId: "MOSQUITO",
      oneTimeCents: null,
      plan: { frequency: "MONTHLY", monthlyCents: 8900, initialFeeCents: 8900 },
      planOnly: true,
      offSeason: true,
      offSeasonMessage:
        "Mosquito season runs April–October. Enroll now and your plan starts today.",
    });
    expect(isPdf(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it("survives a minimal payload (no address, no optional fields)", async () => {
    const pdf = await renderQuotePdf({
      quoteRef: "bk-min",
      quotedAtIso: "2026-07-20T15:00:00.000Z",
      customerName: "Customer",
      serviceLabel: "Rodent treatment",
      serviceId: null,
      oneTimeCents: 30000,
    });
    expect(isPdf(pdf)).toBe(true);
  });
});

describe("the coverage strip is decided by the catalog id, never the label", () => {
  const render = async (serviceId: string | null, serviceLabel: string, plan = true) => {
    const textLog: string[] = [];
    await renderQuotePdf({
      ...base,
      serviceLabel,
      serviceId,
      textLog,
      oneTimeCents: plan ? null : 24900,
      plan: plan ? { frequency: "MONTHLY", monthlyCents: 8900, initialFeeCents: 8900 } : null,
      planOnly: plan,
    });
    const strip = textLog.filter((t) => /^(Mosquitoes|Ticks|Fleas|Wasps & Bees|Mice & Rats|Cockroaches|Spiders|Ants)$/.test(t));
    return { strip, text: textLog.join("\n") };
  };

  it("a MOSQUITO plan shows mosquitoes only", async () => {
    const { strip } = await render("MOSQUITO", "Mosquito plan — up to ½ acre");
    expect(strip).toEqual(["Mosquitoes"]);
  });
  it("a MOSQUITO_TICK plan shows mosquitoes and ticks only", async () => {
    const { strip } = await render("MOSQUITO_TICK", "Mosquito + tick plan — up to ½ acre");
    expect(strip).toEqual(["Mosquitoes", "Ticks"]);
  });
  it("neither seasonal plan shows fleas, whatever the label says", async () => {
    for (const [id, label] of [["MOSQUITO", "Mosquito, tick and flea plan"], ["MOSQUITO_TICK", "Flea season special"]] as const) {
      const { strip } = await render(id, label);
      expect(strip).not.toContain("Fleas");
      if (id === "MOSQUITO") expect(strip).not.toContain("Ticks");
    }
  });
  it("a general recurring plan shows the common lineup", async () => {
    const { strip } = await render("GENERAL_PEST", "General pest control");
    expect(strip).toEqual(["Ants", "Spiders", "Cockroaches", "Wasps & Bees", "Mice & Rats"]);
  });
  it("a one-time wasp service shows wasps, and a label alone decides nothing", async () => {
    const { strip } = await render("WASP_NEST", "Wasp nest removal", false);
    expect(strip).toEqual(["Wasps & Bees"]);
    const { strip: none } = await render(null, "Mosquito plan (label only, no id)", true);
    expect(none).toEqual([]);
  });
  it("labels the plan box neutrally until a payment method is chosen", async () => {
    const { text } = await render("GENERAL_PEST", "General pest control");
    expect(text).toContain("Initial fee");
    expect(text).not.toMatch(/Due at booking|charged at booking/i);
  });
});
