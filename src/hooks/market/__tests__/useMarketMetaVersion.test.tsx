import { renderHook, act } from "@testing-library/react";
import * as Y from "yjs";
import { useMarketMetaVersion } from "../useMarketMetaVersion";

const createMetaMap = () => {
  const doc = new Y.Doc();
  return doc.getMap<unknown>("meta");
};

describe("useMarketMetaVersion", () => {
  it("increments when market meta keys change", () => {
    const metaMap = createMetaMap();
    const { result } = renderHook(() => useMarketMetaVersion(metaMap, true));
    const start = result.current;

    act(() => {
      metaMap.set("market:prices", { edge1: 0.4 });
    });
    expect(result.current).toBe(start + 1);

    const afterPrice = result.current;
    act(() => {
      metaMap.set("market:holdings", { edge1: "2" });
    });
    expect(result.current).toBe(afterPrice + 1);
  });

  it("ignores updates while disabled and resumes once enabled", () => {
    const metaMap = createMetaMap();
    const { result, rerender } = renderHook(
      ({ enabled }) => useMarketMetaVersion(metaMap, enabled),
      { initialProps: { enabled: false } }
    );

    const base = result.current;
    act(() => {
      metaMap.set("market:prices", { edge2: 0.1 });
    });
    expect(result.current).toBe(base);

    act(() => {
      rerender({ enabled: true });
    });
    const afterEnable = result.current;

    act(() => {
      metaMap.set("market:totals", { edge2: "5" });
    });
    expect(result.current).toBe(afterEnable + 1);
  });
});
