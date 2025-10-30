import { renderHook } from "@testing-library/react";
import { useTabIdentifier } from "@/hooks/experiment/multiplayer/useTabIdentifier";

describe("useTabIdentifier storage guards", () => {
  const origLocalSet = Object.getOwnPropertyDescriptor(Storage.prototype, "setItem")?.value;
  const origSessionSet = Object.getOwnPropertyDescriptor(Storage.prototype, "setItem")?.value;
  const origLocalGet = Object.getOwnPropertyDescriptor(Storage.prototype, "getItem")?.value;
  const origSessionGet = Object.getOwnPropertyDescriptor(Storage.prototype, "getItem")?.value;

  afterEach(() => {
    if (origLocalSet) Storage.prototype.setItem = origLocalSet;
    if (origSessionSet) Storage.prototype.setItem = origSessionSet;
    if (origLocalGet) Storage.prototype.getItem = origLocalGet;
    if (origSessionGet) Storage.prototype.getItem = origSessionGet;
  });

  it("returns ids even when storage throws", () => {
    Storage.prototype.setItem = function () { throw new Error("quota"); } as any;
    Storage.prototype.getItem = function () { throw new Error("denied"); } as any;

    const { result } = renderHook(() => useTabIdentifier());
    expect(typeof result.current.sessionId).toBe("string");
    expect(result.current.sessionId.length).toBeGreaterThan(0);
    expect(typeof result.current.tabId).toBe("string");
    expect(result.current.tabId.length).toBeGreaterThan(0);
  });
});

