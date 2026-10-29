// @vitest-environment jsdom

import { act, createElement, Profiler, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { HeadOverrides } from "../seo/head";
import SEO, { HeadProvider, SiteHead } from "./SEO";

let container: HTMLDivElement;
let root: Root;
let commits: number;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Unexpected network request"); }));
  window.history.replaceState({}, "", "/about");
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  commits = 0;
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  document.head.innerHTML = "";
  vi.unstubAllGlobals();
});

async function render(overrides?: HeadOverrides) {
  await act(async () => {
    root.render(createElement(StrictMode, null,
      createElement(Profiler, {
        id: "head",
        onRender: () => {
          // Stop a passive-effect loop before it can hang the test runner.
          if (++commits > 30) throw new Error("SEO metadata updates did not settle");
        },
      }, createElement(HeadProvider, {
        children: createElement(BrowserRouter, null,
          createElement(SiteHead),
          overrides ? createElement(SEO, overrides) : null,
        ),
      })),
    ));
  });
}

function meta(name: string) {
  return document.head.querySelector(`meta[name="${name}"]`)?.getAttribute("content");
}

it("settles metadata updates and restores route defaults when the page override unmounts", async () => {
  await render();
  const defaultTitle = document.title;
  const defaultDescription = meta("description");
  const defaultRobots = meta("robots");

  await render({ title: "Page title", description: "Page description", noindex: true });
  expect(document.title).toBe("Page title | BuzzKill Pest Control");
  expect(meta("description")).toBe("Page description");
  expect(meta("robots")).toBe("noindex, nofollow");
  expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href"))
    .toBe("https://www.pestbuzzkill.com/about");

  await render({ title: "Updated title", description: "Updated description" });
  expect(document.title).toBe("Updated title | BuzzKill Pest Control");
  expect(meta("description")).toBe("Updated description");
  expect(meta("robots")).toBe(defaultRobots);

  await render();
  expect(document.title).toBe(defaultTitle);
  expect(meta("description")).toBe(defaultDescription);
  expect(meta("robots")).toBe(defaultRobots);
});
