import { useCallback, useEffect, useRef, useState } from "react";
import { useGraphActions } from "../GraphContext";

type HoverTracking = {
  hovered: boolean;
  setHovered: (v: boolean) => void;
  onEnter: () => void;
  onLeave: () => void;
  scheduleHoldRelease: () => void;
  clearHoldTimer: () => void;
};

export const useHoverTracking = (id: string): HoverTracking => {
  const { hoveredNodeId, setHoveredNodeId } = useGraphActions() as any;
  const [hovered, setHovered] = useState(false);
  const holdTimerRef = useRef<number | null>(null);
  const hoverDebounceRef = useRef<number | null>(null);

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const clearHoverDebounce = useCallback(() => {
    if (hoverDebounceRef.current) {
      window.clearTimeout(hoverDebounceRef.current);
      hoverDebounceRef.current = null;
    }
  }, []);

  const debouncedSetHovered = useCallback(
    (value: boolean) => {
      clearHoverDebounce();
      hoverDebounceRef.current = window.setTimeout(() => {
        setHoveredNodeId?.(value ? id : null);
        hoverDebounceRef.current = null;
      }, 10);
    },
    [id, setHoveredNodeId, clearHoverDebounce]
  );

  const scheduleHoldRelease = useCallback(() => {
    clearHoldTimer();
    holdTimerRef.current = window.setTimeout(() => {
      setHovered(false);
      holdTimerRef.current = null;
    }, 100);
  }, [clearHoldTimer]);

  const onEnter = useCallback(() => {
    clearHoldTimer();
    setHovered(true);
    debouncedSetHovered(true);
  }, [clearHoldTimer, debouncedSetHovered]);

  const onLeave = useCallback(() => {
    scheduleHoldRelease();
    if (hoveredNodeId === id) debouncedSetHovered(false);
  }, [scheduleHoldRelease, debouncedSetHovered, hoveredNodeId, id]);

  useEffect(
    () => () => {
      clearHoldTimer();
      clearHoverDebounce();
    },
    [clearHoldTimer, clearHoverDebounce]
  );

  return {
    hovered,
    setHovered,
    onEnter,
    onLeave,
    scheduleHoldRelease,
    clearHoldTimer,
  };
};
