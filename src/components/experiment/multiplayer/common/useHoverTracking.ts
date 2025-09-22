import { useCallback, useEffect, useRef, useState } from "react";
import { useGraphActions } from "../GraphContext";

type HoverTracking = {
  hovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

export const useHoverTracking = (id: string): HoverTracking => {
  const { hoveredNodeId, setHoveredNodeId } = useGraphActions() as any;
  const [hovered, setHovered] = useState(false);
  const holdTimerRef = useRef<number | null>(null);

  // Sync local state with global state
  useEffect(() => {
    setHovered(hoveredNodeId === id);
  }, [hoveredNodeId, id]);

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const onMouseEnter = useCallback(() => {
    clearHoldTimer();
    setHoveredNodeId?.(id);
  }, [id, setHoveredNodeId, clearHoldTimer]);

  const onMouseLeave = useCallback(() => {
    clearHoldTimer();
    if (hoveredNodeId === id) {
      setHoveredNodeId?.(null);
    }
  }, [hoveredNodeId, id, setHoveredNodeId, clearHoldTimer]);

  useEffect(
    () => () => {
      clearHoldTimer();
    },
    [clearHoldTimer]
  );

  return {
    hovered,
    onMouseEnter,
    onMouseLeave,
  };
};
