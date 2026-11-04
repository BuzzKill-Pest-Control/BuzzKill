import { describe, expect, it, vi } from "vitest";
import PageErrorBoundary from "./PageErrorBoundary";
import { captureRenderFailure } from "../lib/browserMonitoring";

vi.mock("../lib/browserMonitoring", () => ({ captureRenderFailure: vi.fn() }));

describe("PageErrorBoundary monitoring", () => {
  it("reports swallowed customer page failures without attaching component props or stack text", () => {
    const boundary = new PageErrorBoundary({ children: null });
    const failure = new TypeError("customer jane@example.com failed to render");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    boundary.componentDidCatch(failure, { componentStack: "customer jane@example.com" });
    expect(captureRenderFailure).toHaveBeenCalledWith(failure, "render.web_page");
    expect(PageErrorBoundary.getDerivedStateFromError(failure)).toEqual({ failed: true, offline: false });
    consoleError.mockRestore();
  });
});
