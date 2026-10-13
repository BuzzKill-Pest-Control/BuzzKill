// @vitest-environment jsdom
import { act, createElement, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAsync } from "./useAsync";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function Screen({ load, selection = "first" }: {
  load: () => Promise<string>;
  selection?: string;
}) {
  const { data, error, loading, reload } = useAsync(load, [selection]);
  return createElement("div", null,
    createElement("output", null, loading ? "Loading" : error ?? data),
    createElement("button", { onClick: reload }, "Reload"),
  );
}

function deferred() {
  let resolve!: (value: string) => void;
  const promise = new Promise<string>((done) => { resolve = done; });
  return { promise, resolve };
}

async function render(load: () => Promise<string>, selection?: string) {
  await act(async () => root.render(
    createElement(StrictMode, null, createElement(Screen, { load, selection })),
  ));
}

const output = () => container.querySelector("output")?.textContent;

describe("useAsync under the CRM's Strict Mode root", () => {
  it("shows loaded data and supports reload after effect replay", async () => {
    const load = vi.fn().mockResolvedValue("Initial rows");
    await render(load);
    expect(output()).toBe("Initial rows");

    load.mockResolvedValue("Refreshed rows");
    await act(async () => container.querySelector("button")!.click());
    expect(output()).toBe("Refreshed rows");
  });

  it("shows a load failure and allows a successful retry", async () => {
    const load = vi.fn().mockRejectedValue(new Error("Could not read rows"));
    await render(load);
    expect(output()).toBe("Could not read rows");

    load.mockResolvedValue("Recovered rows");
    await act(async () => container.querySelector("button")!.click());
    expect(output()).toBe("Recovered rows");
  });

  it("ignores the response from the cleaned-up effect", async () => {
    const old = deferred();
    const current = deferred();
    const load = vi.fn()
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(current.promise);
    await render(load);
    expect(output()).toBe("Loading");

    await act(async () => current.resolve("Current rows"));
    expect(output()).toBe("Current rows");
    await act(async () => old.resolve("Stale rows"));
    expect(output()).toBe("Current rows");
  });

  it("ignores an older selection's response after a dependency change", async () => {
    const old = deferred();
    const current = deferred();
    await render(() => old.promise, "first");
    await render(() => current.promise, "second");
    expect(output()).toBe("Loading");

    await act(async () => current.resolve("Second selection"));
    expect(output()).toBe("Second selection");
    await act(async () => old.resolve("First selection"));
    expect(output()).toBe("Second selection");
  });
});
