import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Node, Edge } from '@xyflow/react';
import { useNodeHelpers } from '@/hooks/experiment/multiplayer/useNodeHelpers';

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
  const [dimsVersion, setDimsVersion] = useState(0);
  const pendingCenterIdsRef = useRef<Set<string>>(new Set());
  const { getEdgeMidpoint } = useNodeHelpers({ nodes, edges });

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

  useLayoutEffect(() => {
    if (connectMode) return;
    try {
      const eps = 0.1;
      const desired = new Map<string, { x: number; y: number; parentEdgeId: string }>();
      const edgesList = edges as any[];

      for (const e of edgesList) {
        if ((e?.type || '') !== 'objection') continue;
        const targetId = String(e?.target || '');
        if (!targetId.startsWith('anchor:')) continue;
        const parentEdgeId = targetId.slice('anchor:'.length);
        const mid = getEdgeMidpoint(parentEdgeId);
        if (!mid) continue;
        desired.set(targetId, { x: mid.x, y: mid.y, parentEdgeId });
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
  }, [nodes, edges, getEdgeMidpoint, setNodes, dimsVersion, connectMode]);

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
