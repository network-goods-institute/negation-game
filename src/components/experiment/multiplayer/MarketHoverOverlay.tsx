"use client";
import React from "react";
import { useViewport, useReactFlow } from "@xyflow/react";
import { useGraphActions } from "./GraphContext";
import { getNodeDimensionsAndCenter } from "@/utils/experiment/multiplayer/nodeUtils";
import { scaleToShares, calculateMarketInfluence, normalizeSecurityId } from "@/utils/market/marketUtils";

type Props = {
  prices: Record<string, number> | null;
  totals: Record<string, string> | null;
  holdings: Record<string, string> | null;
  docId?: string | null;
};

export const MarketHoverOverlay: React.FC<Props> = ({ prices, totals, holdings, docId }) => {
  const rf = useReactFlow();
  const { x: vx, y: vy, zoom } = useViewport();
  const graph = useGraphActions();
  const nodeId = (graph as any)?.hoveredNodeId as string | null;
  const [alt, setAlt] = React.useState(false);
  const [breakdown, setBreakdown] = React.useState<Array<{ userId: string; amountScaled: string; displayName?: string | null }>>([]);
  const [loading, setLoading] = React.useState(false);
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.altKey) setAlt(true); };
    const up = (e: KeyboardEvent) => { if (!e.altKey) setAlt(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  React.useEffect(() => {
    const onMove = (e: MouseEvent) => { setAlt(Boolean(e.altKey)); };
    window.addEventListener('mousemove', onMove);
    return () => { window.removeEventListener('mousemove', onMove); };
  }, []);

  // Fetch breakdown on Alt (always call hook; guard inside)
  React.useEffect(() => {
    let aborted = false;
    (async () => {
      const resolvedDoc = String(docId || (typeof window !== "undefined" ? (window.location.pathname.split("/").pop() || "") : ""));
      if (!alt || !resolvedDoc || !nodeId) { setBreakdown([]); return; }
      try {
        setLoading(true);
        const res = await fetch(`/api/market/${encodeURIComponent(String(resolvedDoc))}/holdings-breakdown`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ securityId: String(nodeId) }),
        });
        if (!res.ok) { setBreakdown([]); return; }
        const json = await res.json();
        if (!aborted) setBreakdown(Array.isArray(json?.rows) ? json.rows : []);
      } catch { if (!aborted) setBreakdown([]); }
      finally { if (!aborted) setLoading(false); }
    })();
    return () => { aborted = true; };
  }, [alt, docId, nodeId]);

  const normalizedId = nodeId ? normalizeSecurityId(String(nodeId)) : null;
  const show = Boolean(normalizedId && prices && (prices as any)[normalizedId] != null);
  if (!show) return null;
  try {
    const n = rf.getNode(nodeId!) as any;
    if (!n) return null;
    const { centerX, centerY, height } = getNodeDimensionsAndCenter(n);
    const x = centerX * zoom + vx;
    const nodeTopScreen = (centerY - height / 2) * zoom + vy;
    const y = nodeTopScreen - 16;
    const key = normalizeSecurityId(nodeId!);
    const price = (prices as any)[key] as number;
    const tot = totals ? scaleToShares(totals[key] || "0") : 0;
    const mine = holdings ? scaleToShares(holdings[key] || "0") : 0;
    const infl = calculateMarketInfluence(mine, tot);


    return (
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 6 }}>
        <div
          className="absolute bg-white/95 border border-stone-200 text-stone-800 rounded-lg shadow-md text-[13px] leading-[1.35] px-3 py-2"
          style={{ left: x, top: y, transform: "translate(-50%, -100%)", minWidth: 260, maxWidth: 360 }}
        >
          <div>Price: <span className="font-semibold">{price.toFixed(4)}</span></div>
          {tot !== 0 && (
            <div>Total shares: <span className="font-mono">{tot.toFixed(4)}</span></div>
          )}
          {mine !== 0 && (
            <div>Your shares: <span className="font-mono">{mine.toFixed(4)}</span></div>
          )}
          {tot !== 0 && (
            <div>Influence: <span className="font-mono">{`${infl >= 0 ? '+' : ''}${infl.toFixed(2)}`}</span></div>
          )}
        </div>
      </div>
    );
  } catch {
    return null;
  }
};
