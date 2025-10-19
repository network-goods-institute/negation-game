import React from 'react';
import { useGraphActions } from '../GraphContext';

interface MindchangeBreakdownProps {
  dir: 'forward' | 'backward';
  edgeId: string;
  edgeType?: string;
}

const breakdownCache: Map<string, { ts: number; data: Array<{ userId: string; username: string; value: number }> }> = new Map();

export const MindchangeBreakdown: React.FC<MindchangeBreakdownProps> = ({ dir, edgeId, edgeType }) => {
  const [items, setItems] = React.useState<Array<{ userId: string; username: string; value: number }>>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const graph = useGraphActions();

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (!graph.getMindchangeBreakdown) return;
      try {
        const key = `${edgeId}:${dir}`;
        const now = Date.now();
        const cached = breakdownCache.get(key);
        if (cached && (now - cached.ts) < 30000) {
          if (mounted) setItems(cached.data);
          if (mounted) setLoading(false);
          return;
        }
        const res = await graph.getMindchangeBreakdown(edgeId);
        const data = dir === 'forward' ? res.forward : res.backward;
        breakdownCache.set(key, { ts: now, data });
        if (!mounted) return;
        setItems(data);
        setLoading(false);
      } catch { }
    })();
    return () => { mounted = false; };
  }, [edgeId, dir, graph]);

  return (
    <div className="text-xs">
      <div className="mb-1 text-[11px] text-gray-600">{loading ? 'Loading…' : `Contributors: ${items.length}`}</div>
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div>No data</div>
      ) : (
        <div className="max-h-40 overflow-auto min-w-40">
          {items.map((it) => {
            const canon = Number(it.value) || 0;
            const disp = edgeType === 'support' ? -canon : canon;
            return (
              <div key={it.userId} className="flex justify-between gap-4">
                <span>{it.username}</span>
                <span>{disp > 0 ? `+${disp}%` : `${disp}%`}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export { breakdownCache };
