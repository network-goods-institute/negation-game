"use client";
import React from "react";
import { scaleToShares } from "@/utils/market/marketUtils";
import { logger } from "@/lib/logger";

export function useBuyAmountPreview(docId: string | null | undefined, securityId: string | null | undefined, amount: number) {
  const [shares, setShares] = React.useState<number | null>(null);
  const [cost, setCost] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!docId || !securityId || !Number.isFinite(amount)) {
      setShares(null);
      setCost(null);
      setLoading(false);
      setError(null);
      return;
    }
    setShares(null);
    setCost(null);
    setError(null);
    let aborted = false;
    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      try {
        setLoading(true);
        const spendScaled = BigInt(Math.round(amount * 1e18)).toString();
        const res = await fetch(`/api/market/${encodeURIComponent(docId)}/buy-amount-preview`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ securityId, spendScaled }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const json = await res.json();
        logger.info("[buyAmountPreview] response", { securityId, amount, spendScaled, json });
        const s = scaleToShares(String(json?.shares || "0"));
        const c = scaleToShares(String(json?.cost || "0"));
        logger.info("[buyAmountPreview] scaled", { shares: s, cost: c });
        if (!aborted) {
          setShares(Number.isFinite(s) ? s : 0);
          setCost(Number.isFinite(c) ? c : null);
          setError(null);
        }
      } catch (e: any) {
        if (!aborted) {
          setError(String(e?.message || e));
          setShares(null);
          setCost(null);
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    }, 200);
    return () => {
      aborted = true;
      try { ctrl.abort(); } catch {}
      window.clearTimeout(t);
    };
  }, [docId, securityId, amount]);

  return { shares, cost, loading, error };
}
