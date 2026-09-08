import { describe, expect, it } from "vitest";
import { Refused, refusal, refusalFrom } from "./refusal";

describe("refusal envelopes", () => {
  it("builds a plain refusal without an offerReuse key", () => {
    const r = refusal("Pick a different email.");
    expect(r).toEqual({ refused: "Pick a different email." });
    expect("offerReuse" in r).toBe(false);
  });

  it("carries offerReuse when the caller can resolve it by confirming", () => {
    expect(refusal("Already signs in.", { offerReuse: true })).toEqual({
      refused: "Already signs in.",
      offerReuse: true,
    });
  });

  it("unwraps a Refused thrown from inside bookkeeping", () => {
    const r = refusalFrom(new Refused("Licence lapsed."));
    expect(r).toEqual({ refused: "Licence lapsed." });
  });

  it("preserves offerReuse through the throw/unwrap round trip", () => {
    const r = refusalFrom(new Refused("Reuse it?", { offerReuse: true }));
    expect(r).toEqual({ refused: "Reuse it?", offerReuse: true });
  });

  // The whole point: a real failure must stay a failure, keep propagating, and
  // keep tripping the alarm. Misclassifying one as a refusal would make the
  // alarm blind to the outages it exists for.
  it("returns null for a real error, so it keeps propagating and alarming", () => {
    expect(refusalFrom(new Error("ThrottlingException: rate exceeded"))).toBeNull();
    expect(refusalFrom(new TypeError("x is not a function"))).toBeNull();
    expect(refusalFrom("a string")).toBeNull();
    expect(refusalFrom(null)).toBeNull();
    expect(refusalFrom(undefined)).toBeNull();
    expect(refusalFrom({ refused: "not an Error" })).toBeNull();
  });

  // A bundled Lambda can hold two copies of this leaf, so identity is not
  // reliable — a refusal that failed the check would silently become a page.
  it("recognizes a Refused from a second copy of this module", () => {
    class OtherCopyRefused extends Error {
      readonly isRefusal = true;
      readonly offerReuse = true;
      constructor(message: string) {
        super(message);
        this.name = "Refused";
      }
    }
    const foreign = new OtherCopyRefused("From another bundle.");
    expect(foreign instanceof Refused).toBe(false);
    expect(refusalFrom(foreign)).toEqual({
      refused: "From another bundle.",
      offerReuse: true,
    });
  });
});
