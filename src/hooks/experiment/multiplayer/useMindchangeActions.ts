import { useCallback, useRef } from 'react';
import {
  setMindchange as setMindchangeAction,
  getMindchangeBreakdown as getMindchangeBreakdownAction,
} from '@/actions/experimental/mindchange';
import { ORIGIN } from '@/hooks/experiment/multiplayer/yjs/origins';

interface UseMindchangeActionsProps {
  resolvedId: string | null;
  edges: any[];
  userId: string;
  ydoc: any;
  yMetaMap: any;
  setEdges: (updater: (edges: any[]) => any[]) => void;
  setMindchangeSelectMode: (value: boolean) => void;
  setMindchangeEdgeId: (value: string | null) => void;
  setMindchangeNextDir: (value: 'forward' | 'backward' | null) => void;
  setSelectedEdgeId: (value: string | null) => void;
}

export const useMindchangeActions = ({
  resolvedId,
  edges,
  userId,
  ydoc,
  yMetaMap,
  setEdges,
  setMindchangeSelectMode,
  setMindchangeEdgeId,
  setMindchangeNextDir,
  setSelectedEdgeId,
}: UseMindchangeActionsProps) => {
  const mcCacheRef = useRef<Map<string, { ts: number; data: { forward: Array<{ userId: string; username: string; value: number }>; backward: Array<{ userId: string; username: string; value: number }> } }>>(new Map());

  const setMindchange = useCallback(async (edgeId: string, params: { forward?: number; backward?: number }) => {
    const enableMindchange = ["true", "1", "yes", "on"].includes(String(process.env.NEXT_PUBLIC_ENABLE_MINDCHANGE || '').toLowerCase());
    if (!enableMindchange) return;
    if (!resolvedId) return;
    try {
      const typeNow = (edges.find((e: any) => e.id === edgeId)?.type as string | undefined);
      const edgeTypeNow = (typeNow === 'negation' || typeNow === 'objection') ? 'negation' : 'support';
      const res = await setMindchangeAction(resolvedId, edgeId, params.forward, params.backward, edgeTypeNow as any, userId);
      if ((res as any)?.ok && ydoc && yMetaMap) {
        const averages = (res as any).averages as { forward: number; backward: number; forwardCount: number; backwardCount: number };
        const key = `mindchange:${edgeId}`;
        try {
          (ydoc as any).transact(() => {
            (yMetaMap as any).set(key, averages);
          }, ORIGIN.RUNTIME);
        } catch { }
        try {
          const ukey = `mindchange:user:${userId}:${edgeId}`;
          const prev = (yMetaMap as any).get(ukey) || {};
          const snapshot = {
            forward: typeof params.forward === 'number' ? Math.max(0, Math.min(100, Math.round(params.forward))) : (typeof prev.forward === 'number' ? prev.forward : undefined),
            backward: typeof params.backward === 'number' ? Math.max(0, Math.min(100, Math.round(params.backward))) : (typeof prev.backward === 'number' ? prev.backward : undefined),
          } as any;
          (ydoc as any).transact(() => {
            (yMetaMap as any).set(ukey, snapshot);
          }, ORIGIN.RUNTIME);
        } catch { }
        try {
          setEdges((prev) => prev.map((e: any) => e.id === edgeId ? { ...e, data: { ...(e.data || {}), mindchange: { forward: { average: averages.forward, count: averages.forwardCount }, backward: { average: averages.backward, count: averages.backwardCount } } } } : e));
        } catch { }
        try {
          setMindchangeSelectMode(false);
          setMindchangeEdgeId(null);
          setMindchangeNextDir(null);
          setSelectedEdgeId(null);
        } catch { }
      }
    } catch { }
  }, [resolvedId, edges, userId, ydoc, yMetaMap, setEdges, setMindchangeSelectMode, setMindchangeEdgeId, setMindchangeNextDir, setSelectedEdgeId]);

  const getMindchangeBreakdown = useCallback(async (edgeId: string) => {
    if (!resolvedId) return { forward: [], backward: [] };
    try {
      const key = edgeId;
      const now = Date.now();
      const cached = mcCacheRef.current.get(key);
      if (cached && (now - cached.ts) < 30000) {
        return cached.data;
      }
      const res = await getMindchangeBreakdownAction(resolvedId, edgeId);
      mcCacheRef.current.set(key, { ts: now, data: res });
      return res;
    } catch {
      return { forward: [], backward: [] };
    }
  }, [resolvedId]);

  return {
    setMindchange,
    getMindchangeBreakdown,
  };
};
