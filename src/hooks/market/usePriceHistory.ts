"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { normalizeSecurityId } from "@/utils/market/marketUtils";

export type PricePoint = {
  timestamp: string;
  price: number;
  deltaScaled?: string;
  costScaled?: string;
};

type CacheEntry = {
  data: PricePoint[];
  updatedAt: number;
};

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();
const pendingRequests = new Map<string, Promise<PricePoint[]>>();

function getCacheKey(docId: string, securityId: string): string {
  return `${docId}::${normalizeSecurityId(securityId)}`;
}

async function fetchPriceHistory(
  docId: string,
  securityId: string,
  limit: number = 100,
  includeBaseline: boolean = true
): Promise<PricePoint[]> {
  const key = getCacheKey(docId, securityId);

  const cached = cache.get(key);
  if (cached && Date.now() - cached.updatedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const pending = pendingRequests.get(key);
  if (pending) {
    return pending;
  }

  const promise = (async () => {
    try {
      const res = await fetch(
        `/api/market/${encodeURIComponent(docId)}/price-history`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            securityId: normalizeSecurityId(securityId),
            limit,
            includeBaseline,
          }),
        }
      );

      if (!res.ok) {
        return [];
      }

      const data = await res.json();
      const arr: PricePoint[] = Array.isArray(data) ? data : [];

      cache.set(key, { data: arr, updatedAt: Date.now() });
      return arr;
    } catch {
      return [];
    } finally {
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      pendingRequests.delete(key);
    }
  })();

  pendingRequests.set(key, promise);
  return promise;
}

export function invalidatePriceHistoryCache(
  docId?: string,
  securityId?: string
): void {
  if (docId && securityId) {
    const key = getCacheKey(docId, securityId);
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    cache.delete(key);
  } else {
    cache.clear();
  }
}

export function computeDelta24h(history: PricePoint[]): number | null {
  if (history.length === 0) return null;

  const last = history[history.length - 1];
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  let baseline = history[0];

  for (let i = history.length - 1; i >= 0; i--) {
    const ts = Date.parse(history[i].timestamp);
    if (Number.isFinite(ts) && ts <= cutoff) {
      baseline = history[i];
      break;
    }
  }

  const pNow = Number(last.price);
  const pBase = Number(baseline.price);

  if (!Number.isFinite(pNow) || !Number.isFinite(pBase)) {
    return null;
  }

  return pNow - pBase;
}

type UsePriceHistoryOptions = {
  docId: string | null;
  securityId: string | null;
  enabled?: boolean;
};

type UsePriceHistoryResult = {
  history: PricePoint[];
  loading: boolean;
  error: boolean;
  delta24h: number | null;
  refetch: () => Promise<void>;
};

export function usePriceHistory({
  docId,
  securityId,
  enabled = true,
}: UsePriceHistoryOptions): UsePriceHistoryResult {
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const normalizedSecurityId = useMemo(
    () => (securityId ? normalizeSecurityId(securityId) : null),
    [securityId]
  );

  const fetchData = useCallback(
    async (bypassCache = false) => {
      if (!docId || !normalizedSecurityId || !enabled) {
        setHistory([]);
        setLoading(false);
        return;
      }

      const key = getCacheKey(docId, normalizedSecurityId);

      if (bypassCache) {
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        cache.delete(key);
      }

      setLoading(true);
      setError(false);

      try {
        const data = await fetchPriceHistory(docId, normalizedSecurityId);
        setHistory(data);
        setError(false);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [docId, normalizedSecurityId, enabled]
  );

  useEffect(() => {
    if (!docId || !normalizedSecurityId || !enabled) {
      setHistory([]);
      setLoading(false);
      return;
    }

    fetchData();

    const onRefresh = () => {
      if (docId && normalizedSecurityId) {
        invalidatePriceHistoryCache(docId, normalizedSecurityId);
        fetchData();
      }
    };

    const onOptimistic = (e: CustomEvent<{ securityId?: string }>) => {
      try {
        const sid = String(e?.detail?.securityId || "");
        if (sid === normalizedSecurityId) {
          invalidatePriceHistoryCache(docId, normalizedSecurityId);
          fetchData();
        }
      } catch {}
    };

    window.addEventListener("market:refresh", onRefresh as EventListener);
    window.addEventListener(
      "market:optimisticTrade",
      onOptimistic as EventListener
    );

    return () => {
      window.removeEventListener("market:refresh", onRefresh as EventListener);
      window.removeEventListener(
        "market:optimisticTrade",
        onOptimistic as EventListener
      );
    };
  }, [docId, normalizedSecurityId, enabled, fetchData]);

  const delta24h = useMemo(() => computeDelta24h(history), [history]);

  const refetch = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  return { history, loading, error, delta24h, refetch };
}
