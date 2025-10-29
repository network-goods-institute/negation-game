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
    if (!resolvedId) return;
    try {
      const typeNow = (edges.find((e: any) => e.id === edgeId)?.type as string | undefined);
      const edgeTypeNow = (typeNow === 'negation' || typeNow === 'objection') ? (typeNow as 'negation' | 'objection') : 'support';
      try { console.log('[Mindchange:Action] setMindchange call', { docId: resolvedId, edgeId, params, edgeTypeNow, userId }); } catch {}
      const res = await setMindchangeAction(resolvedId, edgeId, params.forward, params.backward, edgeTypeNow, userId);
      if ((res as any)?.ok && ydoc && yMetaMap) {
        const averages = (res as any).averages as { forward: number; backward: number; forwardCount: number; backwardCount: number };
        try { console.log('[Mindchange:Action] setMindchange ok', { edgeId, averages }); } catch {}
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
          try { console.log('[Mindchange:Sync] wrote user snapshot', { key: ukey, snapshot }); } catch {}
        } catch { }
        try {
          setEdges((prev) => prev.map((e: any) => {
            if (e.id !== edgeId) return e;
            const prevData = (e.data || {}) as any;
            const prevMC = prevData.mindchange || {};
            const prevUser = prevMC.userValue || {};
            const nextUser = {
              ...prevUser,
              ...(typeof params.forward === 'number' ? { forward: Math.max(0, Math.min(100, Math.round(params.forward))) } : {}),
              ...(typeof params.backward === 'number' ? { backward: Math.max(0, Math.min(100, Math.round(params.backward))) } : {}),
            } as any;
            const nextMC = {
              forward: { average: averages.forward, count: averages.forwardCount },
              backward: { average: averages.backward, count: averages.backwardCount },
              ...(Object.keys(nextUser).length > 0 ? { userValue: nextUser } : {}),
            } as any;
            return { ...e, data: { ...prevData, mindchange: nextMC } };
          }));
        } catch { }
        try {
          setMindchangeSelectMode(false);
          setMindchangeEdgeId(null);
          setMindchangeNextDir(null);
          setSelectedEdgeId(null);
        } catch { }
      } else {
        try { console.warn('[Mindchange:Action] setMindchange failed', { edgeId, params, res }); } catch {}
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
