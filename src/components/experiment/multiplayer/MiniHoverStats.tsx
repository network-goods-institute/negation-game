"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useReactFlow, useViewport } from "@xyflow/react";
import { useGraphActions } from "./GraphContext";
import { normalizeSecurityId } from "@/utils/market/marketUtils";
import { getTrimmedLineCoords } from "@/utils/experiment/multiplayer/edgePathUtils";
import { usePriceHistory } from "@/hooks/market/usePriceHistory";

type Props = { docId: string | null };

export const MiniHoverStats: React.FC<Props> = ({ docId }) => {
  const rf = useReactFlow();
  const { x: vx, y: vy, zoom } = useViewport();
  const graph = useGraphActions() as {
    hoveredNodeId?: string | null;
    hoveredEdgeId?: string | null;
    overlayActiveEdgeId?: string | null;
  };
  const hoveredNodeId: string | null = graph?.hoveredNodeId ?? null;
  const hoveredEdgeId: string | null = graph?.hoveredEdgeId ?? null;
  const overlayEdgeId: string | null = graph?.overlayActiveEdgeId ?? null;

  const [pct, setPct] = useState<number | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [maxWidthPx, setMaxWidthPx] = useState<number | null>(null);

  const targetId = hoveredNodeId || hoveredEdgeId || overlayEdgeId || null;

  const { delta24h, loading } = usePriceHistory({
    docId,
    securityId: targetId,
    enabled: Boolean(targetId && docId),
  });

  const computePosition = useCallback(() => {
    try {
      const container = document.querySelector(
        '[data-testid="graph-canvas-root"]'
      ) as HTMLElement | null;
      if (!container) {
        setPos(null);
        return;
      }
      if (hoveredNodeId) {
        try {
          const selNode = rf.getNode(hoveredNodeId) as { selected?: boolean } | undefined;
          if (selNode?.selected) {
            setPos(null);
            return;
          }
        } catch {}
        try {
          const nodeEl = document.querySelector(
            `.react-flow__node[data-id="${CSS.escape(String(hoveredNodeId))}"]`
          ) as HTMLElement | null;
          if (nodeEl) {
            const rect = nodeEl.getBoundingClientRect();
            const rootRect = container.getBoundingClientRect();
            const left = rect.left - rootRect.left + rect.width / 2;
            const top = rect.top - rootRect.top - 40;
            setPos({ x: left, y: top });
            setMaxWidthPx(Math.max(0, Math.floor(rect.width)));
            return;
          }
        } catch {}
        const n = rf.getNode(hoveredNodeId) as {
          position?: { x: number; y: number };
          width?: number;
          measured?: { width?: number };
        } | undefined;
        if (!n) {
          setPos(null);
          return;
        }
        const w = Number(n?.width ?? n?.measured?.width ?? 0);
        const x = ((n.position?.x ?? 0) + (Number.isFinite(w) ? w / 2 : 0)) * zoom + vx;
        const y = (n.position?.y ?? 0) * zoom + vy;
        try {
          if (Number.isFinite(w) && w > 0)
            setMaxWidthPx(Math.max(0, Math.floor(w * zoom)));
        } catch {}
        setPos({ x, y: y - 40 });
        return;
      }
      const targetEdgeId = (hoveredEdgeId || overlayEdgeId) as string | null;
      if (targetEdgeId) {
        try {
          const overlayContainer = document.querySelector(
            `[data-edge-overlay-container="${CSS.escape(String(targetEdgeId))}"]`
          ) as HTMLElement | null;
          if (overlayContainer) {
            const rect = overlayContainer.getBoundingClientRect();
            const rootRect = container.getBoundingClientRect();
            const left = rect.left - rootRect.left + rect.width / 2;
            const top = rect.top - rootRect.top - 32;
            setPos({ x: left, y: top });
            try {
              const e = rf.getEdges().find((ee) => String(ee.id) === String(targetEdgeId)) as {
                type?: string;
                source: string;
                target: string;
              } | undefined;
              if (e) {
                const isObjection = String(e.type || "") === "objection";
                let sw = 0;
                let tw = 0;
                if (isObjection) {
                  const objNode = rf.getNode(e.source) as { width?: number; measured?: { width?: number } } | undefined;
                  sw = Number(objNode?.width ?? objNode?.measured?.width ?? 0);
                  const anchor = rf.getNode(e.target) as { data?: { parentEdgeId?: string } } | undefined;
                  const baseId = String(anchor?.data?.parentEdgeId || "");
                  if (baseId) {
                    const base = rf.getEdges().find((ee) => String(ee.id) === baseId) as {
                      source: string;
                      target: string;
                    } | undefined;
                    const bs = rf.getNode(base?.source || "") as { width?: number; measured?: { width?: number } } | undefined;
                    const bt = rf.getNode(base?.target || "") as { width?: number; measured?: { width?: number } } | undefined;
                    const bsw = Number(bs?.width ?? bs?.measured?.width ?? 0);
                    const btw = Number(bt?.width ?? bt?.measured?.width ?? 0);
                    tw = Math.min(bsw || 0, btw || 0);
                  } else {
                    tw = sw;
                  }
                } else {
                  const sn = rf.getNode(e.source) as { width?: number; measured?: { width?: number } } | undefined;
                  const tn = rf.getNode(e.target) as { width?: number; measured?: { width?: number } } | undefined;
                  sw = Number(sn?.width ?? sn?.measured?.width ?? 0);
                  tw = Number(tn?.width ?? tn?.measured?.width ?? 0);
                }
                const cap = Math.max(0, Math.floor(Math.min(sw || 0, tw || 0) * zoom));
                setMaxWidthPx(cap > 0 ? cap : null);
              }
            } catch {}
            return;
          }
        } catch {}
        try {
          const selector = `[data-edge-overlay="${CSS.escape(String(targetEdgeId))}"]`;
          const overlayEls = Array.from(
            document.querySelectorAll(selector)
          ) as SVGGraphicsElement[];
          const containerRect = container.getBoundingClientRect();
          if (overlayEls.length > 0) {
            let minLeft = Number.POSITIVE_INFINITY;
            let minTop = Number.POSITIVE_INFINITY;
            let maxRight = Number.NEGATIVE_INFINITY;
            for (const el of overlayEls) {
              const r = el.getBoundingClientRect();
              if (r.left < minLeft) minLeft = r.left;
              if (r.top < minTop) minTop = r.top;
              const right = r.left + r.width;
              if (right > maxRight) maxRight = right;
            }
            if (
              Number.isFinite(minLeft) &&
              Number.isFinite(minTop) &&
              Number.isFinite(maxRight)
            ) {
              const centerLeft = (minLeft + maxRight) / 2;
              const left = centerLeft - containerRect.left;
              const top = minTop - containerRect.top - 32;
              setPos({ x: left, y: top });
              try {
                const e = rf.getEdges().find((ee) => String(ee.id) === String(targetEdgeId)) as {
                  type?: string;
                  source: string;
                  target: string;
                } | undefined;
                if (e) {
                  const isObjection = String(e.type || "") === "objection";
                  let sw = 0,
                    tw = 0;
                  if (isObjection) {
                    const objNode = rf.getNode(e.source) as { width?: number; measured?: { width?: number } } | undefined;
                    sw = Number(objNode?.width ?? objNode?.measured?.width ?? 0);
                    const anchor = rf.getNode(e.target) as { data?: { parentEdgeId?: string } } | undefined;
                    const baseId = String(anchor?.data?.parentEdgeId || "");
                    if (baseId) {
                      const base = rf.getEdges().find((ee) => String(ee.id) === baseId) as {
                        source: string;
                        target: string;
                      } | undefined;
                      const bs = rf.getNode(base?.source || "") as { width?: number; measured?: { width?: number } } | undefined;
                      const bt = rf.getNode(base?.target || "") as { width?: number; measured?: { width?: number } } | undefined;
                      const bsw = Number(bs?.width ?? bs?.measured?.width ?? 0);
                      const btw = Number(bt?.width ?? bt?.measured?.width ?? 0);
                      tw = Math.min(bsw || 0, btw || 0);
                    } else {
                      tw = sw;
                    }
                  } else {
                    const sn = rf.getNode(e.source) as { width?: number; measured?: { width?: number } } | undefined;
                    const tn = rf.getNode(e.target) as { width?: number; measured?: { width?: number } } | undefined;
                    sw = Number(sn?.width ?? sn?.measured?.width ?? 0);
                    tw = Number(tn?.width ?? tn?.measured?.width ?? 0);
                  }
                  const cap = Math.max(
                    0,
                    Math.floor(Math.min(sw || 0, tw || 0) * zoom)
                  );
                  setMaxWidthPx(cap > 0 ? cap : null);
                }
              } catch {}
              return;
            }
          }
        } catch {}
        const e = rf.getEdges().find((ee) => String(ee.id) === String(targetEdgeId)) as {
          type?: string;
          source: string;
          target: string;
        } | undefined;
        if (!e) {
          setPos(null);
          return;
        }
        const sn = rf.getNode(e.source) as {
          position?: { x: number; y: number };
          width?: number;
          height?: number;
          measured?: { width?: number };
          data?: { parentEdgeId?: string };
        } | undefined;
        const tn = rf.getNode(e.target) as {
          position?: { x: number; y: number };
          width?: number;
          height?: number;
          measured?: { width?: number };
          data?: { parentEdgeId?: string };
        } | undefined;
        if (!sn || !tn) {
          setPos(null);
          return;
        }
        const sx = Number(sn.position?.x ?? 0) + Number(sn.width ?? 0) / 2;
        const sy = Number(sn.position?.y ?? 0) + Number(sn.height ?? 0) / 2;
        const tx = Number(tn.position?.x ?? 0) + Number(tn.width ?? 0) / 2;
        const ty = Number(tn.position?.y ?? 0) + Number(tn.height ?? 0) / 2;
        const tcoords = getTrimmedLineCoords(sx, sy, tx, ty, 0, 0, sn, tn);
        const midX = (tcoords.fromX + tcoords.toX) / 2;
        const topFlow = Math.min(tcoords.fromY, tcoords.toY);
        const left = midX * zoom + vx;
        const top = topFlow * zoom + vy - 32;
        setPos({ x: left, y: top });
        try {
          const edge = rf.getEdges().find((ee) => String(ee.id) === String(targetEdgeId)) as {
            type?: string;
          } | undefined;
          const isObjection = String(edge?.type || "") === "objection";
          let sw2 = Number(sn?.width ?? sn?.measured?.width ?? 0);
          let tw2 = Number(tn?.width ?? tn?.measured?.width ?? 0);
          if (isObjection) {
            const anchor = tn;
            const baseId = String(anchor?.data?.parentEdgeId || "");
            if (baseId) {
              const base = rf.getEdges().find((ee) => String(ee.id) === baseId) as {
                source: string;
                target: string;
              } | undefined;
              const bs = rf.getNode(base?.source || "") as { width?: number; measured?: { width?: number } } | undefined;
              const bt = rf.getNode(base?.target || "") as { width?: number; measured?: { width?: number } } | undefined;
              const bsw = Number(bs?.width ?? bs?.measured?.width ?? 0);
              const btw = Number(bt?.width ?? bt?.measured?.width ?? 0);
              tw2 = Math.min(bsw || 0, btw || 0);
            } else {
              tw2 = sw2;
            }
          }
          const cap = Math.max(0, Math.floor(Math.min(sw2 || 0, tw2 || 0) * zoom));
          setMaxWidthPx(cap > 0 ? cap : null);
        } catch {}
        return;
      }
      setPos(null);
      setMaxWidthPx(null);
    } catch {
      setPos(null);
    }
  }, [hoveredNodeId, hoveredEdgeId, overlayEdgeId, rf, vx, vy, zoom]);

  useEffect(() => {
    let rafId: number | null = null;
    const tick = () => {
      computePosition();
      rafId = requestAnimationFrame(tick);
    };
    if (hoveredNodeId || hoveredEdgeId || overlayEdgeId) {
      rafId = requestAnimationFrame(tick);
    } else {
      computePosition();
    }
    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [hoveredNodeId, hoveredEdgeId, overlayEdgeId, computePosition]);

  useEffect(() => {
    const id = hoveredNodeId || hoveredEdgeId || overlayEdgeId || null;
    if (!id || !docId) {
      setPct(null);
      return;
    }
    try {
      if (hoveredNodeId) {
        const n = rf.getNode(hoveredNodeId) as { data?: { market?: { price?: number } } } | undefined;
        const p = Number(n?.data?.market?.price);
        if (Number.isFinite(p)) setPct(p);
      } else if (hoveredEdgeId || overlayEdgeId) {
        const targetEdgeId = (hoveredEdgeId || overlayEdgeId) as string;
        const e = rf.getEdges().find((ee) => String(ee.id) === String(targetEdgeId)) as {
          data?: { market?: { price?: number } };
        } | undefined;
        const p = Number(e?.data?.market?.price);
        if (Number.isFinite(p)) setPct(p);
      }
    } catch {}
  }, [hoveredNodeId, hoveredEdgeId, overlayEdgeId, docId, rf]);

  try {
    if (hoveredNodeId) {
      const n = rf.getNode(hoveredNodeId) as { selected?: boolean; type?: string } | undefined;
      if (n?.selected) return null;
      const nodeType = (n?.type || "").toLowerCase();
      if (
        nodeType === "statement" ||
        nodeType === "comment" ||
        nodeType === "edge_anchor"
      ) {
        return null;
      }
    }
    if (hoveredEdgeId || overlayEdgeId) {
      const targetEdgeId = (hoveredEdgeId || overlayEdgeId) as string;
      const e = rf.getEdges().find((ee) => String(ee.id) === String(targetEdgeId)) as {
        type?: string;
      } | undefined;
      const edgeType = (e?.type || "").toLowerCase();
      if (
        edgeType !== "support" &&
        edgeType !== "negation" &&
        edgeType !== "objection"
      ) {
        return null;
      }
    }
  } catch {}
  if (!pos || pct == null) return null;
  const d = delta24h ?? 0;
  const color =
    d > 0 ? "text-emerald-600" : d < 0 ? "text-rose-600" : "text-stone-800";
  const sign = d > 0 ? "+" : d < 0 ? "" : "";
  const fontSizePx = Math.max(10, Math.min(13, 12 + (zoom - 1) * 2));

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 7 }}
    >
      <div
        className={`absolute bg-white subpixel-antialiased border border-stone-200 rounded-md shadow-sm px-2.5 py-1.5 flex items-center gap-1 font-sans ${color}`}
        style={{
          left: Math.round(pos.x),
          top: Math.round(pos.y),
          transform: "translate(-50%, 0)",
          maxWidth: maxWidthPx != null ? `${maxWidthPx}px` : undefined,
          minWidth: 140,
          fontSize: fontSizePx,
        }}
      >
        <span className="whitespace-nowrap overflow-hidden text-ellipsis">
          {(pct * 100).toFixed(1)}% chance
        </span>
        {loading ? (
          <span className="whitespace-nowrap overflow-hidden text-ellipsis text-stone-500 flex items-center gap-1">
            <span>(</span>
            <span className="inline-block w-3 h-3 rounded-full border-2 border-gray-300 border-t-emerald-500 animate-spin" />
            <span>)</span>
          </span>
        ) : (
          <span className="whitespace-nowrap overflow-hidden text-ellipsis">
            {d !== 0
              ? `(${sign}${(Math.abs(d) * 100).toFixed(1)}%)`
              : "(0.0%)"}
          </span>
        )}
      </div>
    </div>
  );
};
