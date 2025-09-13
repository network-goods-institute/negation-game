import { useEffect, useRef } from 'react';

export interface AnchorPositionConfig {
  id: string;
  x: number;
  y: number;
  updateEdgeAnchorPosition: (id: string, x: number, y: number) => void;
}

export const useEdgeAnchorPosition = ({ id, x, y, updateEdgeAnchorPosition }: AnchorPositionConfig) => {
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    const last = lastPosRef.current;
    if (last && Math.abs(last.x - x) < 0.5 && Math.abs(last.y - y) < 0.5) return;

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      lastPosRef.current = { x, y };
      updateEdgeAnchorPosition(id, x, y);
    });

    return () => cancelAnimationFrame(rafRef.current);
  }, [x, y, id, updateEdgeAnchorPosition]);
};