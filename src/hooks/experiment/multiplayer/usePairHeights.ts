import { useState, useCallback } from 'react';

/**
 * Manages heights for paired/grouped nodes to ensure uniform sizing.
 * Tracks individual node heights within groups and calculates max height per group.
 *
 * @returns Height state and update functions for paired nodes
 */
export const usePairHeights = () => {
  const [pairNodeHeights, setPairNodeHeights] = useState<Record<string, Record<string, number>>>({});
  const [pairHeights, setPairHeights] = useState<Record<string, number>>({});

  const setPairNodeHeight = useCallback((groupId: string, nodeId: string, height: number) => {
    const nextH = Math.max(0, Math.floor(height));
    setPairNodeHeights((prev) => {
      const prevGroup = prev[groupId] || {};
      const prevH = prevGroup[nodeId] ?? 0;
      if (prevH === nextH) return prev;
      const group = { ...prevGroup, [nodeId]: nextH } as Record<string, number>;
      const next = { ...prev, [groupId]: group } as Record<string, Record<string, number>>;
      const maxH = Object.values(group).reduce((m, h) => Math.max(m, h || 0), 0);
      setPairHeights((ph) => (ph[groupId] === maxH ? ph : { ...ph, [groupId]: maxH }));
      return next;
    });
  }, []);

  const commitGroupLayout = useCallback((
    groupId: string,
    positions: Record<string, { x: number; y: number }>,
    width: number,
    height: number,
    nodes: any[],
    yNodesMap: any,
    ydoc: any,
    canWrite: boolean,
    localOrigin: object,
    setNodes: (updater: (nodes: any[]) => any[]) => void
  ) => {
    if (!canWrite) return;
    try {
      (ydoc as any)?.transact?.(() => {
        const gBase = (yNodesMap as any)?.get(groupId);
        const curGroup = (nodes as any[])?.find?.((n: any) => n.id === groupId);
        const pos = curGroup?.position || gBase?.position || { x: 0, y: 0 };
        if (gBase) {
          (yNodesMap as any).set(groupId, {
            ...gBase,
            position: pos,
            width,
            height,
            style: { ...((gBase as any).style || {}), width, height },
          });
        }
        Object.entries(positions || {}).forEach(([nid, pos]) => {
          const base = (yNodesMap as any)?.get(nid);
          if (base) {
            (yNodesMap as any).set(nid, { ...base, position: { x: pos.x, y: pos.y } });
          }
        });
      }, localOrigin);
    } catch { }
    // Update local state immediately as well
    setNodes((nds: any[]) => nds.map((n: any) => {
      if (n.id === groupId) return { ...n, width, height, style: { ...(n.style || {}), width, height } };
      const p = (positions as any)[n.id];
      if (p) return { ...n, position: { ...(n.position || { x: 0, y: 0 }), x: p.x, y: p.y } };
      return n;
    }));
  }, []);

  return {
    pairNodeHeights,
    pairHeights,
    setPairNodeHeight,
    commitGroupLayout,
  };
};
