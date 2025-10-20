import { useMemo } from 'react';
import { getMarkerIdForEdgeType } from './EdgeArrowMarkers';

interface MindchangeRenderConfig {
  mode: 'normal' | 'bidirectional';
  markerId?: string;
  markerStart?: string;
  markerEnd?: string;
}

export const useMindchangeRenderConfig = (
  mindchange: any,
  edgeTypeForMarker: string
): MindchangeRenderConfig => {
  return useMemo(() => {
    if (!mindchange) {
      return { mode: 'normal', markerStart: undefined, markerEnd: undefined };
    }

    const forwardCount = mindchange?.forward?.count ?? 0;
    const backwardCount = mindchange?.backward?.count ?? 0;
    const hasForward = forwardCount > 0;
    const hasBackward = backwardCount > 0;

    if (!hasForward && !hasBackward) {
      return { mode: 'normal', markerStart: undefined, markerEnd: undefined };
    }

    const markerId = getMarkerIdForEdgeType(edgeTypeForMarker);

    // Show two parallel lanes when BOTH forward and backward exist (including objections, but no arrows)
    if (hasForward && hasBackward) {
      return {
        mode: 'bidirectional',
        markerId: markerId ?? undefined, // null for objections = no arrows
        markerStart: undefined,
        markerEnd: undefined,
      } as const;
    }

    // For single-direction, only show arrows if markerId exists
    if (!markerId) {
      return { mode: 'normal', markerStart: undefined, markerEnd: undefined };
    }

    return {
      mode: 'normal',
      markerStart: hasBackward ? `url(#${markerId})` : undefined,
      markerEnd: hasForward ? `url(#${markerId})` : undefined,
    } as const;
  }, [mindchange, edgeTypeForMarker]);
};
