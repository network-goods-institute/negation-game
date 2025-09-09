import React from 'react';
import { useReactFlow } from '@xyflow/react';
import { useGraphActions } from '../GraphContext';
import { isDirectNeighbor } from '@/utils/experiment/multiplayer/negation';

type Params = {
  id: string;
  wrapperRef: React.RefObject<HTMLElement>;
  isActive: boolean;
  scale?: number;
};

export const useNeighborEmphasis = ({ id, wrapperRef, isActive, scale = 1.06 }: Params) => {
  const rf = useReactFlow();
  const { hoveredNodeId } = useGraphActions() as any;
  const [isOnScreen, setIsOnScreen] = React.useState(true);

  React.useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsOnScreen(entry.isIntersecting && entry.intersectionRatio > 0.05);
      },
      { root: null, threshold: [0, 0.05, 0.1, 0.5, 1] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [wrapperRef]);

  const emphasize = React.useMemo(() => {
    if (!hoveredNodeId || hoveredNodeId === id) return false;
    try {
      const edges = rf.getEdges();
      return isDirectNeighbor(hoveredNodeId, id, edges as any);
    } catch {
      return false;
    }
  }, [hoveredNodeId, id, rf]);

  const style = React.useMemo(() => {
    const shouldEmphasize = emphasize && isOnScreen;
    if (!shouldEmphasize && !isActive) return undefined;
    const emphasizeScale = shouldEmphasize ? scale : (isActive ? 1.02 : 1);
    const translateY = isActive ? '-1px' : '0px';
    return {
      transform: `translateY(${translateY}) scale(${emphasizeScale})`,
      transition: 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1)',
      willChange: 'transform',
    } as React.CSSProperties;
  }, [emphasize, isOnScreen, isActive, scale]);

  return style;
};
