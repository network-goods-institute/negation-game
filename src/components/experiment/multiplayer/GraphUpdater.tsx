import { useEffect, useRef, useState } from 'react';
import { useReactFlow, Node, Edge, getBezierPath, Position } from '@xyflow/react';

interface GraphUpdaterProps {
  nodes: Node[];
  edges: Edge[];
  setNodes: (updater: (nodes: Node[]) => Node[]) => void;
  documentId?: string;
  centerQueueVersion?: number;
  consumeCenterQueue?: () => string[];
  connectMode?: boolean;
}

export const GraphUpdater: React.FC<GraphUpdaterProps> = ({ nodes, edges, setNodes, documentId, centerQueueVersion, consumeCenterQueue, connectMode }) => {
  const rf = useReactFlow();
  const [dimsVersion, setDimsVersion] = useState(0);
  const pendingCenterIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      const layer = document.querySelector('.react-flow__nodes');
      if (!layer || typeof ResizeObserver === 'undefined') return;
      let rafId: number | null = null;
      const ro = new ResizeObserver(() => {
        if (rafId != null) return;
        rafId = window.requestAnimationFrame(() => {
          rafId = null;
          setDimsVersion((v) => v + 1);
        });
      });
      const observeAll = () => {
        const els = document.querySelectorAll('.react-flow__node');
        els.forEach((el) => ro.observe(el));
      };
      observeAll();
      const mo = new MutationObserver(() => observeAll());
      mo.observe(layer, { childList: true, subtree: true });
      return () => {
        try { ro.disconnect(); } catch { }
        try { mo.disconnect(); } catch { }
        if (rafId != null) {
          try { window.cancelAnimationFrame(rafId); } catch { }
          rafId = null;
        }
      };
    } catch { }
  }, []);

  useEffect(() => {
    pendingCenterIdsRef.current = new Set();
  }, [documentId]);

  useEffect(() => {
    if (!consumeCenterQueue) return;
    const ids = consumeCenterQueue();
    if (Array.isArray(ids) && ids.length > 0) {
      for (const id of ids) pendingCenterIdsRef.current.add(id);
      setDimsVersion((v) => v + 1);
    }
  }, [centerQueueVersion, consumeCenterQueue]);

  useEffect(() => {
    if (connectMode) return;
    try {
      const eps = 0.1;
      const edgesList = edges as any[];
      const edgesById = new Map<string, any>();
      for (const e of edgesList) edgesById.set(String(e?.id || ''), e);

      const desired = new Map<string, { x: number; y: number; parentEdgeId: string }>();

      const getDims = (n: any) => {
        const w = Number(n?.width ?? (n?.measured?.width ?? n?.style?.width ?? 0)) || 0;
        const h = Number(n?.height ?? (n?.measured?.height ?? n?.style?.height ?? 0)) || 0;
        return { w, h };
      };
      const center = (n: any) => {
        const { w, h } = getDims(n);
        const x = Number(n?.position?.x ?? 0) + w / 2;
        const y = Number(n?.position?.y ?? 0) + h / 2;
        return { x, y, w, h };
      };
      const betweenBorders = (sa: any, ta: any) => {
        const sx = sa.x, sy = sa.y, tx = ta.x, ty = ta.y;
        const sw = sa.w, sh = sa.h, tw = ta.w, th = ta.h;

        if (!Number.isFinite(sw) || !Number.isFinite(sh) || !Number.isFinite(tw) || !Number.isFinite(th) || sw <= 0 || sh <= 0 || tw <= 0 || th <= 0) {
          return { x: (sx + tx) / 2, y: (sy + ty) / 2 };
        }

        const dx = tx - sx;
        const dy = ty - sy;
        if (dx === 0 && dy === 0) return { x: sx, y: sy };

        const intersectRect = (cx: number, cy: number, halfW: number, halfH: number, dirX: number, dirY: number) => {
          const adx = Math.abs(dirX);
          const ady = Math.abs(dirY);
          if (adx === 0 && ady === 0) return { x: cx, y: cy };
          const txScale = adx > 0 ? halfW / adx : Number.POSITIVE_INFINITY;
          const tyScale = ady > 0 ? halfH / ady : Number.POSITIVE_INFINITY;
          const t = Math.min(txScale, tyScale);
          return { x: cx + dirX * t, y: cy + dirY * t };
        };

        const fromS = intersectRect(sx, sy, sw / 2, sh / 2, dx, dy);
        const fromT = intersectRect(tx, ty, tw / 2, th / 2, -dx, -dy);
        return { x: (fromS.x + fromT.x) / 2, y: (fromS.y + fromT.y) / 2 };
      };

      const wanted: Array<{ anchorId: string; parentEdgeId: string; parent: any }> = [];
      for (const e of edgesList) {
        if ((e?.type || '') !== 'objection') continue;
        const targetId = String(e?.target || '');
        if (!targetId.startsWith('anchor:')) continue;
        const parentEdgeId = targetId.slice('anchor:'.length);
        const parent = edgesById.get(parentEdgeId);
        if (!parent) continue;
        wanted.push({ anchorId: targetId, parentEdgeId, parent });
      }
      if (wanted.length === 0) return;

      const computeForEdge = (edge: any) => {
        const s = rf.getNode(String(edge.source));
        const t = rf.getNode(String(edge.target));
        if (!s || !t) return null;
        const sc = center(s);
        const tc = center(t);
        if (String(edge?.type || '') === 'objection') {
          const sourcePosition = sc.y < tc.y ? Position.Bottom : Position.Top;
          const targetPosition = sc.y > tc.y ? Position.Bottom : Position.Top;
          const [_path, lx, ly] = getBezierPath({
            sourceX: sc.x,
            sourceY: sc.y,
            sourcePosition,
            targetX: tc.x,
            targetY: tc.y,
            targetPosition,
            curvature: 0.35,
          });
          // If we have real dimensions for both nodes, prefer between-borders midpoint like the HUD
          const hasDims = Number.isFinite(sc.w) && Number.isFinite(sc.h) && Number.isFinite(tc.w) && Number.isFinite(tc.h) && sc.w > 0 && sc.h > 0 && tc.w > 0 && tc.h > 0;
          if (hasDims) {
            const bb = betweenBorders(sc, tc);
            return bb;
          }
          return { x: lx, y: ly };
        }
        return betweenBorders(sc, tc);
      };

      // First pass: anchors whose parent edge is not objection (base edges)
      for (const w of wanted) {
        if (String(w.parent?.type || '') === 'objection') continue;
        const pos = computeForEdge(w.parent);
        if (!pos) continue;
        desired.set(w.anchorId, { x: pos.x, y: pos.y, parentEdgeId: w.parentEdgeId });
      }

      // Second pass: anchors whose parent is an objection (nested). Use existing or newly-computed anchor positions.
      for (const w of wanted) {
        if (String(w.parent?.type || '') !== 'objection') continue;

        const s = rf.getNode(String(w.parent.source));
        let t = rf.getNode(String(w.parent.target));
        let sc = s ? center(s) : null;
        let tc = t ? center(t) : null;
        if (!tc) {
          const aid = String(w.parent.target);
          const cached = desired.get(aid);
          if (cached) {
            tc = { x: cached.x, y: cached.y, w: 0, h: 0 } as any;
          }
        }
        if (sc && tc) {
          const sourcePosition = sc.y < tc.y ? Position.Bottom : Position.Top;
          const targetPosition = sc.y > tc.y ? Position.Bottom : Position.Top;
          const [_path, lx, ly] = getBezierPath({
            sourceX: sc.x,
            sourceY: sc.y,
            sourcePosition,
            targetX: tc.x,
            targetY: tc.y,
            targetPosition,
            curvature: 0.35,
          });
          const hasDims = Number.isFinite(sc.w) && Number.isFinite(sc.h) && Number.isFinite(tc.w) && Number.isFinite(tc.h) && sc.w > 0 && sc.h > 0 && tc.w > 0 && tc.h > 0;
          const { x, y } = hasDims ? betweenBorders(sc, tc) : { x: lx, y: ly };
          desired.set(w.anchorId, { x, y, parentEdgeId: w.parentEdgeId });
        }
      }

      if (desired.size === 0) return;

      setNodes((nds: any[]) => {
        const existing = new Map<string, any>();
        for (const n of nds as any[]) existing.set(n.id, n);
        const out: any[] = [];
        let changed = false;

        desired.forEach(({ x, y, parentEdgeId }, anchorId) => {
          const current = existing.get(anchorId);
          if (!current) {
            out.push({ id: anchorId, type: 'edge_anchor', position: { x, y }, data: { parentEdgeId }, draggable: false, selectable: false } as any);
            changed = true;
          } else {
            const px = current?.position?.x ?? 0;
            const py = current?.position?.y ?? 0;
            if (Math.abs(px - x) > eps || Math.abs(py - y) > eps) {
              out.push({ ...current, position: { x, y } });
              changed = true;
            }
          }
        });

        if (!changed) return nds;

        return (nds as any[]).map((n) => {
          const upd = out.find((m) => m.id === (n as any).id);
          return upd || n;
        }).concat(out.filter((n) => !existing.has(n.id)));
      });
    } catch { }
  }, [nodes, edges, rf, setNodes, dimsVersion, connectMode]);

  // Center newly-created nodes under their parents after measurement
  useEffect(() => {
    if (connectMode) return;
    try {
      const eps = 0.1;
      const nodesToCenter: Array<{ nodeId: string; newX: number }> = [];
      const processedIds: string[] = [];

      for (const node of nodes) {
        if (!pendingCenterIdsRef.current.has(node.id)) continue;
        const nodeId = node.id;
        if (node.type !== 'point' && node.type !== 'objection') continue;

        const measured = (node as any).measured;
        if (!measured?.width || !measured?.height) continue;

        // Check if node has multiple parents - if so, skip auto-centering
        // (multi-parent positioning is already calculated correctly in addPointBelow)
        const parentEdges = edges.filter((e: any) => e.source === nodeId);
        if (parentEdges.length === 0) continue;
        if (parentEdges.length > 1) {
          processedIds.push(nodeId);
          continue;
        }

        const parentEdge = parentEdges[0];

        const parentNode = nodes.find((n) => n.id === parentEdge.target);
        if (!parentNode) continue;

        const parentMeasured = (parentNode as any).measured;
        if (!parentMeasured?.width) continue;

        const getAbsoluteX = (n: any) => {
          let x = n.position.x;
          if (n.parentId) {
            const parent = nodes.find((p) => p.id === n.parentId);
            if (parent) x += parent.position.x;
          }
          return x;
        };

        const parentAbsX = getAbsoluteX(parentNode);
        const nodeAbsX = getAbsoluteX(node);

        const centeredX = parentAbsX + (parentMeasured.width / 2) - (measured.width / 2);

        if (Math.abs(nodeAbsX - centeredX) > eps) {
          nodesToCenter.push({ nodeId, newX: centeredX });
        }
        processedIds.push(nodeId);
      }

      if (nodesToCenter.length === 0) return;

      setNodes((nds: any[]) => {
        return nds.map((n: any) => {
          const update = nodesToCenter.find((u) => u.nodeId === n.id);
          if (!update) return n;

          let newX = update.newX;
          if (n.parentId) {
            const parent = nds.find((p: any) => p.id === n.parentId);
            if (parent) newX -= parent.position.x;
          }

          return {
            ...n,
            position: { ...n.position, x: newX }
          };
        });
      });
      // Clear processed ids so centering happens only once per node
      for (const id of processedIds) {
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        pendingCenterIdsRef.current.delete(id);
      }
    } catch { }
  }, [nodes, edges, setNodes, dimsVersion, connectMode]);

  useEffect(() => {
    if (!connectMode) return;
    try { pendingCenterIdsRef.current = new Set(); } catch { }
  }, [connectMode]);

  return null;
};
