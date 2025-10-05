import { useMemo, useRef } from "react";
import { useReactFlow, useViewport } from "@xyflow/react";

interface UseConnectionSnappingProps {
  connectMode: boolean;
  connectAnchorId: string | null | undefined;
  connectCursor: { x: number; y: number } | null;
  edgesLayer: SVGElement | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export interface SnapTarget {
  kind: "node" | "edge" | "edge_anchor";
  id: string;
  x: number;
  y: number;
}

export const useConnectionSnapping = ({
  connectMode,
  connectAnchorId,
  connectCursor,
  edgesLayer,
  containerRef,
}: UseConnectionSnappingProps): {
  origin: { x: number; y: number };
  snappedPosition: { x: number; y: number } | null;
  snappedTarget: SnapTarget | null;
} => {
  const rf = useReactFlow();
  const viewport = useViewport();
  const snappedTargetRef = useRef<null | SnapTarget>(null);

  // Compute origin for the preview line
  const origin = useMemo(() => {
    if (!connectMode || !connectAnchorId) return { x: 0, y: 0 };

    // Edge-origin (when starting from an edge)
    if (
      typeof connectAnchorId === "string" &&
      connectAnchorId.startsWith("anchor:")
    ) {
      const edgeId = connectAnchorId.slice("anchor:".length);
      // Try reading the actual SVG path midpoint for this edge
      const groups = edgesLayer?.querySelectorAll(
        "g.react-flow__edge"
      ) as NodeListOf<SVGGElement> | null;
      if (groups && groups.length) {
        for (const g of Array.from(groups)) {
          const gid = (g.getAttribute("data-id") ||
            (g.id || "").replace(/^reactflow__edge-/, "")) as string;
          if (gid !== edgeId) continue;
          const path = (g.querySelector("path.react-flow__edge-path") ||
            g.querySelector("path")) as SVGPathElement | null;
          if (path) {
            const len = path.getTotalLength();
            const pt = path.getPointAtLength(len / 2);
            return { x: pt.x, y: pt.y };
          }
        }
      }
      // Fallback: midpoint between source/target node centers
      const e = rf.getEdges().find((ed: any) => ed.id === edgeId);
      if (e) {
        const s = rf.getNode(e.source);
        const t = rf.getNode(e.target);
        if (s && t) {
          const sHas =
            typeof s.width === "number" &&
            typeof s.height === "number" &&
            s.width > 0 &&
            s.height > 0;
          const tHas =
            typeof t.width === "number" &&
            typeof t.height === "number" &&
            t.width > 0 &&
            t.height > 0;
          const sx = sHas ? s.position.x + (s.width || 0) / 2 : s.position.x;
          const sy = sHas ? s.position.y + (s.height || 0) / 2 : s.position.y;
          const tx = tHas ? t.position.x + (t.width || 0) / 2 : t.position.x;
          const ty = tHas ? t.position.y + (t.height || 0) / 2 : t.position.y;
          return { x: (sx + tx) / 2, y: (sy + ty) / 2 };
        }
      }
      return { x: 0, y: 0 };
    }

    // Node-origin (bottom-center)
    const n = rf.getNode(connectAnchorId as string);
    if (!n) return { x: 0, y: 0 };
    const hasDims =
      typeof n.width === "number" &&
      typeof n.height === "number" &&
      (n.width as number) > 0 &&
      (n.height as number) > 0;
    if (hasDims) {
      return {
        x: n.position.x + (n.width || 0) / 2,
        y: n.position.y + (n.height || 0),
      };
    }
    if (!containerRef.current) return { x: n.position.x, y: n.position.y };
    const el = containerRef.current.querySelector(
      `.react-flow__node[data-id="${n.id}"]`
    ) as HTMLElement | null;
    if (el) {
      const rect = el.getBoundingClientRect();
      const bottomCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height,
      };
      const p = rf.screenToFlowPosition(bottomCenter);
      return { x: p.x, y: p.y };
    }
    return { x: n.position.x, y: n.position.y };
  }, [connectMode, connectAnchorId, edgesLayer, rf, containerRef]);

  // Ensure origin is never undefined
  const safeOrigin = origin || { x: 0, y: 0 };

  // Compute all snap targets
  const snapTargets = useMemo((): {
    nodeTargets: Array<{ id: string; x: number; y: number; type?: string }>;
    edgeAnchors: Array<{ id: string; x: number; y: number }>;
    edgeMidpoints: Array<{ id: string; x: number; y: number }>;
  } | null => {
    if (!connectMode || !connectAnchorId) return null;

    const originId = connectAnchorId;
    const nodesAll = rf.getNodes();

    // Node targets (bottom-center)
    const nodeTargets: Array<{
      id: string;
      x: number;
      y: number;
      type?: string;
    }> = nodesAll
      .map((node: any) => {
        const hasDims =
          typeof node.width === "number" &&
          typeof node.height === "number" &&
          node.width > 0 &&
          node.height > 0;
        if (hasDims) {
          return {
            id: node.id,
            x: node.position.x + (node.width || 0) / 2,
            y: node.position.y + (node.height || 0),
            type: node.type,
          };
        }
        if (!containerRef.current)
          return {
            id: node.id,
            x: node.position.x,
            y: node.position.y,
            type: node.type,
          };
        const el = containerRef.current.querySelector(
          `.react-flow__node[data-id="${node.id}"]`
        ) as HTMLElement | null;
        if (el) {
          const rect = el.getBoundingClientRect();
          const bottomCenter = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height,
          };
          const p = rf.screenToFlowPosition(bottomCenter);
          return { id: node.id, x: p.x, y: p.y, type: node.type };
        }
        return {
          id: node.id,
          x: node.position.x,
          y: node.position.y,
          type: node.type,
        };
      })
      .filter((c) => c.id !== originId && c.type !== "edge_anchor");

    // Edge anchor targets (center)
    const edgeAnchors: Array<{ id: string; x: number; y: number }> = nodesAll
      .filter((node: any) => node.type === "edge_anchor")
      .map((node: any) => {
        const hasDims =
          typeof node.width === "number" &&
          typeof node.height === "number" &&
          node.width > 0 &&
          node.height > 0;
        if (hasDims) {
          return {
            id: node.id,
            x: node.position.x + (node.width || 0) / 2,
            y: node.position.y + (node.height || 0) / 2,
          };
        }
        if (!containerRef.current)
          return { id: node.id, x: node.position.x, y: node.position.y };
        const el = containerRef.current.querySelector(
          `.react-flow__node[data-id="${node.id}"]`
        ) as HTMLElement | null;
        if (el) {
          const rect = el.getBoundingClientRect();
          const center = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          };
          const p = rf.screenToFlowPosition(center);
          return { id: node.id, x: p.x, y: p.y };
        }
        return { id: node.id, x: node.position.x, y: node.position.y };
      });

    // Edge midpoints from actual SVG paths
    const edgeMidpoints: Array<{ id: string; x: number; y: number }> = (() => {
      const result: Array<{ id: string; x: number; y: number }> = [];
      const groups = edgesLayer?.querySelectorAll(
        "g.react-flow__edge"
      ) as NodeListOf<SVGGElement> | null;
      if (!groups) return result;
      for (const g of Array.from(groups)) {
        const gid = (g.getAttribute("data-id") ||
          (g.id || "").replace(/^reactflow__edge-/, "")) as string;
        if (!gid) continue;
        const path = (g.querySelector("path.react-flow__edge-path") ||
          g.querySelector("path")) as SVGPathElement | null;
        if (!path) continue;
        const len = path.getTotalLength();
        if (!Number.isFinite(len) || len <= 0) continue;
        const pt = path.getPointAtLength(len / 2);
        result.push({ id: gid, x: pt.x, y: pt.y });
      }
      return result;
    })();

    return { nodeTargets, edgeAnchors, edgeMidpoints };
  }, [connectMode, connectAnchorId, rf, edgesLayer, containerRef]);

  // Compute snapped position and target
  const snappedPosition = useMemo(() => {
    if (!connectMode || !connectAnchorId || !connectCursor || !snapTargets) {
      snappedTargetRef.current = null;
      return null;
    }

    const { nodeTargets, edgeAnchors, edgeMidpoints } = snapTargets;
    const cursorFlow = connectCursor;
    const cursorScreen = {
      x: viewport.x + cursorFlow.x * viewport.zoom,
      y: viewport.y + cursorFlow.y * viewport.zoom,
    };

    const thresholdPx = 64; // Much more sensitive

    let best: null | (SnapTarget & { dist: number }) = null;

    // Check node targets
    for (const c of nodeTargets) {
      const s = {
        x: viewport.x + c.x * viewport.zoom,
        y: viewport.y + c.y * viewport.zoom,
      };
      const dx = s.x - cursorScreen.x,
        dy = s.y - cursorScreen.y;
      const d = Math.hypot(dx, dy);
      if (best == null || d < best.dist) {
        best = { kind: "node", id: c.id, x: c.x, y: c.y, dist: d };
      }
    }

    // Check edge midpoints
    for (const m of edgeMidpoints) {
      const s = {
        x: viewport.x + m.x * viewport.zoom,
        y: viewport.y + m.y * viewport.zoom,
      };
      const dx = s.x - cursorScreen.x,
        dy = s.y - cursorScreen.y;
      const d = Math.hypot(dx, dy);
      if (best == null || d < best.dist) {
        best = { kind: "edge", id: m.id, x: m.x, y: m.y, dist: d };
      }
    }

    // Check edge anchors
    for (const a of edgeAnchors) {
      const s = {
        x: viewport.x + a.x * viewport.zoom,
        y: viewport.y + a.y * viewport.zoom,
      };
      const dx = s.x - cursorScreen.x,
        dy = s.y - cursorScreen.y;
      const d = Math.hypot(dx, dy);
      if (best == null || d < best.dist) {
        best = { kind: "edge_anchor", id: a.id, x: a.x, y: a.y, dist: d };
      }
    }

    if (best && best.dist <= thresholdPx) {
      snappedTargetRef.current = {
        kind: best.kind,
        id: best.id,
        x: best.x,
        y: best.y,
      };
      return { x: best.x, y: best.y };
    } else {
      snappedTargetRef.current = null;
      return null;
    }
  }, [connectMode, connectAnchorId, connectCursor, snapTargets, viewport]);

  return {
    origin: safeOrigin,
    snappedPosition: snappedPosition ?? null,
    snappedTarget: snappedTargetRef.current,
  };
};
