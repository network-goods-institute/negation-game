import { renderHook, act } from "@testing-library/react";
import { useTabIdentifier } from "@/hooks/experiment/multiplayer/useTabIdentifier";

describe("useTabIdentifier", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    // @ts-ignore
    delete (window as any).__mpTabId;
  });

  it("provides stable sessionId and tabId", () => {
    const { result, unmount } = renderHook(() => useTabIdentifier());

    const first = result.current;
    expect(typeof first.sessionId).toBe("string");
    expect(first.sessionId.length).toBeGreaterThan(0);
    expect(typeof first.tabId).toBe("string");
    expect(first.tabId.length).toBeGreaterThan(0);

    unmount();
    // same page lifecycle: reuse in-memory tab id
    const { result: result2 } = renderHook(() => useTabIdentifier());
    const second = result2.current;
    expect(second.sessionId).toBe(first.sessionId);
    expect(second.tabId).toBe(first.tabId);
  });

  it("generates fresh tabId even if sessionStorage has a value (duplication)", () => {
    sessionStorage.setItem("multiplayer-tab-id", "preexisting-tab");
    // simulate a new duplicated page where in-memory id isn't set
    // @ts-ignore
    delete (window as any).__mpTabId;

    const { result } = renderHook(() => useTabIdentifier());
    expect(result.current.tabId).not.toBe("preexisting-tab");
    expect(typeof result.current.tabId).toBe("string");
    expect(result.current.tabId.length).toBeGreaterThan(0);
  });

  it("tracks active tab from document visibility", () => {
    const { result } = renderHook(() => useTabIdentifier());

    expect(result.current.isActiveTab).toBe(true);

    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current.isActiveTab).toBe(false);

    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current.isActiveTab).toBe(true);
  });
});
