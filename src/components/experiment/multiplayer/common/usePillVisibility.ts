import { useEffect, useRef, useState } from "react";

export const usePillVisibility = (hideDelay: number = 400) => {
  const [pillVisible, setPillVisible] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, []);

  const scheduleHide = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      setPillVisible(false);
    }, hideDelay);
  };

  const cancelHide = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const handleMouseEnter = () => {
    cancelHide();
    setPillVisible(true);
  };

  const handleMouseLeave = () => {
    scheduleHide();
  };

  const hideNow = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setPillVisible(false);
  };

  return {
    pillVisible,
    scheduleHide,
    cancelHide,
    handleMouseEnter,
    handleMouseLeave,
    hideNow,
  };
};
