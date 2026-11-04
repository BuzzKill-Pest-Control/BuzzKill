// @vitest-environment jsdom
import { act, createElement, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRecordSection } from "./useRecordSection";
import type { RecordPage } from "./customerRecordReads";
type Row = { id: string };
const page = (id: string, nextToken: string | null = null): RecordPage<Row> => ({ items: id ? [{ id }] : [], nextToken });
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (reason: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
let root: Root, node: HTMLDivElement, section: ReturnType<typeof useRecordSection<Row>>;
let key = "owner:one";
const read = vi.fn<(token?: string) => Promise<RecordPage<Row>>>();
function Probe() { section = useRecordSection(key, read); return createElement("p", null, section.data?.items.map((row) => row.id).join(",")); }
async function render() { await act(async () => root.render(createElement(StrictMode, null, createElement(Probe)))); }
beforeEach(() => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); read.mockReset(); key = "owner:one"; node = document.createElement("div"); document.body.append(node); root = createRoot(node); });
afterEach(async () => { await act(async () => root.unmount()); node.remove(); vi.unstubAllGlobals(); });
describe("lazy customer record sections", () => {
  it("does not fetch closed sections, loads one useful page on open, and retries an empty continuation", async () => {
    read.mockResolvedValueOnce(page("one", "a")).mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(page("", "b")).mockResolvedValueOnce(page("two"));
    await render(); expect(read).not.toHaveBeenCalled();
    await act(async () => section.setOpen(true)); expect(node.textContent).toBe("one"); expect(read).toHaveBeenCalledTimes(1);
    await act(async () => section.loadMore()); expect(section.moreError).toBe("offline"); expect(section.data?.nextToken).toBe("a");
    await act(async () => section.loadMore()); expect(section.data?.nextToken).toBe("b");
    await act(async () => section.loadMore()); expect(node.textContent).toBe("one,two"); expect(section.data?.nextToken).toBeNull();
  });
  it("refreshes only an opened section and preserves the user's loaded page depth", async () => {
    read.mockResolvedValueOnce(page("one", "a")).mockResolvedValueOnce(page("two", "b"));
    await render(); await act(async () => section.setOpen(true)); await act(async () => section.loadMore());
    await act(async () => section.setOpen(false)); await act(async () => section.refresh()); expect(read).toHaveBeenCalledTimes(2);
    read.mockResolvedValueOnce(page("new-one", "c")).mockResolvedValueOnce(page("new-two"));
    await act(async () => section.setOpen(true)); expect(node.textContent).toBe("new-one,new-two"); expect(read).toHaveBeenCalledTimes(4);
  });
  it("does not let a late load-more overwrite a refresh or cross a route/login key", async () => {
    const late = deferred<RecordPage<Row>>(); read.mockResolvedValueOnce(page("one", "a")).mockReturnValueOnce(late.promise).mockResolvedValueOnce(page("fresh"));
    await render(); await act(async () => section.setOpen(true)); let pending!: Promise<void>;
    await act(async () => { pending = section.loadMore(); }); await act(async () => section.refresh());
    await act(async () => late.resolve(page("stale"))); await pending; expect(node.textContent).toBe("fresh");
    key = "other:two"; await render(); expect(section.open).toBe(false); expect(section.data).toBeNull(); expect(node.textContent).toBe("");
  });
  it("ignores a request completed after close/unmount, and permits retry on reopen", async () => {
    const late = deferred<RecordPage<Row>>(); read.mockResolvedValueOnce(page("one", "a")).mockReturnValueOnce(late.promise).mockResolvedValueOnce(page("two"));
    await render(); await act(async () => section.setOpen(true)); let pending!: Promise<void>;
    await act(async () => { pending = section.loadMore(); section.setOpen(false); });
    await act(async () => late.resolve(page("ignored"))); await pending; expect(section.data?.items).toEqual([{ id: "one" }]);
    await act(async () => section.setOpen(true)); await act(async () => section.loadMore()); expect(node.textContent).toBe("one,two");
    const afterUnmount = deferred<RecordPage<Row>>(); read.mockReturnValueOnce(afterUnmount.promise);
    await act(async () => { void section.refresh(); }); await act(async () => root.unmount());
    await act(async () => afterUnmount.resolve(page("gone")));
    root = createRoot(node); // afterEach owns this replacement root.
  });
  it("surfaces a first-page error, clears loading on retry, and does not fabricate an empty history", async () => {
    read.mockRejectedValueOnce(new Error("history unavailable")).mockResolvedValueOnce(page("recovered"));
    await render(); await act(async () => section.setOpen(true)); expect(section.error).toBe("history unavailable"); expect(section.data).toBeNull(); expect(section.loading).toBe(false);
    await act(async () => section.refresh()); expect(section.error).toBeNull(); expect(node.textContent).toBe("recovered");
  });
});
