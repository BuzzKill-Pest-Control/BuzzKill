import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import QuotePage from "./QuotePage";

function renderQuote(location: string): string {
  return renderToStaticMarkup(
    createElement(StaticRouter, { location }, createElement(QuotePage))
  );
}

describe("quote entry routes", () => {
  it.each([
    "/quote",
    "/quote/",
    "/quote?utm_source=google",
    "/quote?lead=existing-booking-link",
    "/quote/instant",
  ])("opens the pricing form immediately at %s", (location) => {
    const html = renderQuote(location);
    expect(html).toContain("Price it now, book it online.");
    expect(html).toContain('id="bq-service"');
    expect(html).toContain('id="bq-street"');
    expect(html).toContain("Get my instant price");
    expect(html).not.toContain("Tell us what you need.</h1>");
  });

  it.each(["/quote/contact-me", "/quote/contact-me/"])(
    "keeps a callback available when explicitly requested at %s",
    (location) => {
      const html = renderQuote(location);
      expect(html).toContain("Tell us what you need.</h1>");
      expect(html).not.toContain('id="bq-street"');
      expect(html).toContain('href="/quote/instant"');
    }
  );
});
