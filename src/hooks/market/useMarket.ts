"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type MarketView = {
  prices: Record<string, number>;
  totals: Record<string, string>;
  userHoldings: Record<string, string>;
  updatedAt: string;
};

async function fetchMarketView(docId: string): Promise<MarketView> {
  const res = await fetch(`/api/market/${encodeURIComponent(docId)}/view`, { cache: "no-store" });
  if (!res.ok) throw new Error(`failed to fetch market view: ${res.status}`);
  return res.json();
}

async function postBuyShares(docId: string, securityId: string, deltaScaled: string) {
  const res = await fetch(`/api/market/${encodeURIComponent(docId)}/buy-shares`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ securityId, deltaScaled }),
  });
  if (!res.ok) throw new Error("buyShares failed");
  return res.json();
}

async function postBuyAmount(docId: string, securityId: string, spendScaled: string) {
  const res = await fetch(`/api/market/${encodeURIComponent(docId)}/buy-amount`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ securityId, spendScaled }),
  });
  if (!res.ok) throw new Error("buyAmount failed");
  return res.json();
}

export function useMarket(docId: string) {
  const enabled = typeof window !== "undefined" && process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED === "true" && Boolean(docId);
  const qc = useQueryClient();
  const key = ["market:view", docId];
  const view = useQuery({ queryKey: key, queryFn: () => fetchMarketView(docId), enabled, staleTime: 30000, refetchOnWindowFocus: false });
  const buyShares = useMutation({
    mutationFn: ({ securityId, deltaScaled }: { securityId: string; deltaScaled: string }) =>
      postBuyShares(docId, securityId, deltaScaled),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
  const buyAmount = useMutation({
    mutationFn: ({ securityId, spendScaled }: { securityId: string; spendScaled: string }) =>
      postBuyAmount(docId, securityId, spendScaled),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
  return { view, buyShares, buyAmount };
}

