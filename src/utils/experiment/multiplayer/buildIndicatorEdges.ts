import type { Edge } from '@xyflow/react';

export type NodeRect = { cx: number; cy: number; w: number; h: number };

export const buildIndicatorEdges = (
  edges: Edge[],
  featureEnabled: boolean,
  visibleEdgeIds?: Set<string>,
  getNodeRect?: (id: string) => NodeRect | null
): Edge[] => {
  if (!featureEnabled) return [];
  const out: Edge[] = [];
  for (const e of edges as any[]) {
    const t = String(e?.type || '');
    if (t === 'objection') continue;
    if (visibleEdgeIds && !visibleEdgeIds.has(String(e.id))) continue;
    const mc = (e as any)?.data?.mindchange;
    const canonicalF = Number(mc?.forward?.average || 0);
    const canonicalB = Number(mc?.backward?.average || 0);
    const sign = (t === 'support') ? -1 : 1;
    const fAvg = canonicalF * sign;
    const bAvg = canonicalB * sign;
    if (fAvg !== 0) {
      out.push({
        id: `mcind:${e.id}:forward`,
        type: 'mindchange_indicator',
        source: e.source,
        target: e.target,
        data: {
          direction: 'forward',
          value: fAvg,
          sourceRect: getNodeRect ? getNodeRect(String(e.source)) : undefined,
          targetRect: getNodeRect ? getNodeRect(String(e.target)) : undefined,
        },
        selectable: false as any,
        focusable: false as any,
      } as any);
    }
    if (bAvg !== 0) {
      out.push({
        id: `mcind:${e.id}:backward`,
        type: 'mindchange_indicator',
        source: e.target,
        target: e.source,
        data: {
          direction: 'backward',
          value: bAvg,
          sourceRect: getNodeRect ? getNodeRect(String(e.target)) : undefined,
          targetRect: getNodeRect ? getNodeRect(String(e.source)) : undefined,
        },
        selectable: false as any,
        focusable: false as any,
      } as any);
    }
  }
  return out;
};
