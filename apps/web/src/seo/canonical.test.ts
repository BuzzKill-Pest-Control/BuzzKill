import { describe, expect, it } from "vitest";
import {
  SITE_ORIGIN,
  absoluteUrl,
  assetUrl,
  canonicalPathFor,
  canonicalUrlFor,
  normalizePath,
} from "./canonical";

describe("canonical origin", () => {
  it("is the www host on https, inside pestbuzzkill.com", () => {
    expect(SITE_ORIGIN).toBe("https://www.pestbuzzkill.com");
  });
});

describe("normalizePath", () => {
  it("keeps the root as a single slash", () => {
    expect(normalizePath("/")).toBe("/");
    expect(normalizePath("")).toBe("/");
    expect(normalizePath("//")).toBe("/");
    expect(normalizePath("/index.html")).toBe("/");
  });
  it("strips trailing slashes and index.html from pages", () => {
    expect(normalizePath("/about/")).toBe("/about");
    expect(normalizePath("/about//")).toBe("/about");
    expect(normalizePath("/about/index.html")).toBe("/about");
    expect(normalizePath("/services/termite/")).toBe("/services/termite");
  });
  it("collapses repeated slashes and lower-cases", () => {
    expect(normalizePath("/services//termite")).toBe("/services/termite");
    expect(normalizePath("/About")).toBe("/about");
    expect(normalizePath("/pest-control/Acton-MA")).toBe("/pest-control/acton-ma");
  });
  it("decodes percent escapes and tolerates bad ones", () => {
    expect(normalizePath("/pest-control/acton%2Dma")).toBe("/pest-control/acton-ma");
    expect(normalizePath("/%E0%A4%A")).toBe("/%e0%a4%a");
  });
});

describe("canonicalPathFor", () => {
  it("maps the /residential service aliases onto /services", () => {
    expect(canonicalPathFor("/residential/termite")).toBe("/services/termite");
    expect(canonicalPathFor("/residential/rodent-control/attic/")).toBe(
      "/services/rodent-control/attic",
    );
  });
  it("leaves the /residential landing page alone", () => {
    expect(canonicalPathFor("/residential")).toBe("/residential");
    expect(canonicalPathFor("/residential/")).toBe("/residential");
  });
  it("folds the two quote doors into /quote", () => {
    expect(canonicalPathFor("/quote/instant")).toBe("/quote");
    expect(canonicalPathFor("/quote/contact-me")).toBe("/quote");
    expect(canonicalPathFor("/quote")).toBe("/quote");
  });
  it("never canonicalises a unique page to the home page", () => {
    for (const p of ["/about", "/contact", "/privacy-policy", "/terms-of-service", "/services/termite", "/locations/massachusetts"]) {
      expect(canonicalPathFor(p)).toBe(p);
    }
  });
});

describe("absoluteUrl", () => {
  it("keeps the slash on the root and nowhere else", () => {
    expect(absoluteUrl("/")).toBe("https://www.pestbuzzkill.com/");
    expect(absoluteUrl("/about/")).toBe("https://www.pestbuzzkill.com/about");
    expect(canonicalUrlFor("/About/")).toBe("https://www.pestbuzzkill.com/about");
    expect(canonicalUrlFor("/index.html")).toBe("https://www.pestbuzzkill.com/");
  });
  it("resolves assets on the canonical origin and passes absolute URLs through", () => {
    expect(assetUrl("/images/logo.png")).toBe("https://www.pestbuzzkill.com/images/logo.png");
    expect(assetUrl("images/logo.png")).toBe("https://www.pestbuzzkill.com/images/logo.png");
    expect(assetUrl("https://cdn.example.com/x.jpg")).toBe("https://cdn.example.com/x.jpg");
  });
});
