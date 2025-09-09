import React from 'react';
import { useGraphActions } from '../GraphContext';

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
  const [hovered, setHovered] = React.useState(false);
  const holdTimerRef = React.useRef<number | null>(null);
  const hoverDebounceRef = React.useRef<number | null>(null);

  const clearHoldTimer = React.useCallback(() => {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const clearHoverDebounce = React.useCallback(() => {
    if (hoverDebounceRef.current) {
      window.clearTimeout(hoverDebounceRef.current);
      hoverDebounceRef.current = null;
    }
  }, []);

  const debouncedSetHovered = React.useCallback((value: boolean) => {
    clearHoverDebounce();
    hoverDebounceRef.current = window.setTimeout(() => {
      setHoveredNodeId?.(value ? id : null);
      hoverDebounceRef.current = null;
    }, 10);
  }, [id, setHoveredNodeId, clearHoverDebounce]);

  const scheduleHoldRelease = React.useCallback(() => {
    clearHoldTimer();
    holdTimerRef.current = window.setTimeout(() => {
      setHovered(false);
      holdTimerRef.current = null;
    }, 100);
  }, [clearHoldTimer]);

  const onEnter = React.useCallback(() => {
    clearHoldTimer();
    setHovered(true);
    debouncedSetHovered(true);
  }, [clearHoldTimer, debouncedSetHovered]);

  const onLeave = React.useCallback(() => {
    scheduleHoldRelease();
    if (hoveredNodeId === id) debouncedSetHovered(false);
  }, [scheduleHoldRelease, debouncedSetHovered, hoveredNodeId, id]);

  React.useEffect(() => () => {
    clearHoldTimer();
    clearHoverDebounce();
  }, [clearHoldTimer, clearHoverDebounce]);

  return { hovered, setHovered, onEnter, onLeave, scheduleHoldRelease, clearHoldTimer };
};

