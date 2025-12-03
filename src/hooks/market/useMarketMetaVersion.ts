import { useEffect, useState } from "react";
import * as Y from "yjs";

const MARKET_KEYS = new Set([
  "market:prices",
  "market:holdings",
  "market:totals",
  "market:updatedAt",
  "market:docId",
  "market:source",
]);

export function useMarketMetaVersion(
  yMetaMap: Y.Map<unknown> | null | undefined,
  enabled: boolean
): number {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!enabled || !yMetaMap) return;
    const bump = () => setVersion((v) => v + 1);
    const handleMetaChange = (event: Y.YMapEvent<unknown>) => {
      try {
        for (const key of event.keysChanged || []) {
          if (MARKET_KEYS.has(String(key))) {
            bump();
            return;
          }
        }
      } catch {
        bump();
      }
    };

    bump();
    yMetaMap.observe(handleMetaChange);
    return () => {
      try {
        yMetaMap.unobserve(handleMetaChange);
      } catch {}
    };
  }, [enabled, yMetaMap]);

  return version;
}
