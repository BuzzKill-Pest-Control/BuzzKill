// @vitest-environment jsdom
import { act, createElement, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkQueue } from "./useWorkQueue";
import type { WorkItem } from "./api";
import type { WorkPage, WorkStatus } from "./workQueueReads";

const mocks = vi.hoisted(() => ({ page: vi.fn(), archive: vi.fn() }));
vi.mock("./workQueueReads", async (importOriginal) => ({
  ...await importOriginal<typeof import("./workQueueReads")>(),
  readWorkPage: mocks.page, readResolvedWork: mocks.archive,
}));
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
const page = (id: string, nextToken: string | null = null): WorkPage => ({ items: [{ id, status: "OPEN" } as WorkItem], nextToken });
let root: Root, container: HTMLDivElement, latest: ReturnType<typeof useWorkQueue>, renders: number;
function Harness({ status = "OPEN", suspended = false }: { status?: WorkStatus; suspended?: boolean }) {
  latest = useWorkQueue(status, suspended); renders++;
  return createElement("div", null, latest.data?.items.map((item) => item.id).join(",") ?? "loading");
}
async function render(props: Parameters<typeof Harness>[0] = {}, strict = false) {
  await act(async () => root.render(strict ? createElement(StrictMode, null, createElement(Harness, props)) : createElement(Harness, props)));
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mocks.page.mockReset().mockResolvedValue(page("first", "page-2")); mocks.archive.mockReset().mockResolvedValue([]);
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container); renders = 0;
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

describe("work continuation lifecycle", () => {
  it("replaces a pending continuation on refresh and keeps the refreshed cursor", async () => {
    const old = deferred<WorkPage>();
    mocks.page.mockResolvedValueOnce(page("first", "old-cursor")).mockReturnValueOnce(old.promise).mockResolvedValueOnce(page("refreshed", "new-cursor"));
    await render(); await act(async () => { void latest.loadMore(); });
    await act(async () => latest.reload());
    await act(async () => old.resolve(page("obsolete")));
    expect(container.textContent).toBe("refreshed"); expect(latest.data?.nextToken).toBe("new-cursor"); expect(latest.moreLoading).toBe(false);
  });

  it("discards a continuation when a sheet/action suspends updates and retries the same cursor afterward", async () => {
    const pending = deferred<WorkPage>();
    mocks.page.mockResolvedValueOnce(page("first", "page-2")).mockReturnValueOnce(pending.promise).mockResolvedValueOnce(page("current"));
    await render(); await act(async () => { void latest.loadMore(); }); await render({ suspended: true });
    await act(async () => pending.resolve(page("arrived-during-edit")));
    expect(container.textContent).toBe("first"); expect(latest.moreLoading).toBe(false);
    await render(); await act(async () => latest.loadMore());
    expect(container.textContent).toBe("first,current"); expect(mocks.page.mock.calls[2]).toEqual(["OPEN", "page-2"]);
  });

  it("allows only one continuation even before React commits the loading state", async () => {
    const pending = deferred<WorkPage>(); mocks.page.mockResolvedValueOnce(page("first", "page-2")).mockReturnValueOnce(pending.promise);
    await render(); await act(async () => { void latest.loadMore(); void latest.loadMore(); });
    expect(mocks.page).toHaveBeenCalledTimes(2);
    await act(async () => pending.resolve(page("second"))); expect(container.textContent).toBe("first,second");
  });

  it("survives StrictMode replay and ignores pending completions or requests after unmount", async () => {
    const abandoned = deferred<WorkPage>(), pending = deferred<WorkPage>();
    mocks.page.mockReturnValueOnce(abandoned.promise).mockResolvedValueOnce(page("active", "page-2")).mockReturnValueOnce(pending.promise);
    await render({}, true); await act(async () => abandoned.resolve(page("abandoned")));
    expect(container.textContent).toBe("active");
    await act(async () => { void latest.loadMore(); });
    const saved = latest; await act(async () => root.unmount()); const count = renders;
    await act(async () => pending.resolve(page("too-late"))); await act(async () => saved.loadMore());
    expect(renders).toBe(count); expect(mocks.page).toHaveBeenCalledTimes(3);
    root = createRoot(container);
  });
});
