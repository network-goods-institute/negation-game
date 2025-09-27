import { useEffect, useState, useRef } from "react";

interface UsePanDetectionProps {
  /** Minimum distance in pixels to consider as panning */
  threshold?: number;
  /** Whether grab mode (pan with left click) is enabled */
  grabMode?: boolean;
}

const PRIMARY_BUTTON = 0;
const MIDDLE_BUTTON = 1;
const PRIMARY_BUTTON_MASK = 1;
const MIDDLE_BUTTON_MASK = 4;

const isPrimaryButtonDown = (buttons: number) =>
  (buttons & PRIMARY_BUTTON_MASK) === PRIMARY_BUTTON_MASK;
const isMiddleButtonDown = (buttons: number) =>
  (buttons & MIDDLE_BUTTON_MASK) === MIDDLE_BUTTON_MASK;

export const usePanDetection = ({
  threshold = 5,
  grabMode = false,
}: UsePanDetectionProps = {}) => {
  const [isPanning, setIsPanning] = useState(false);
  const startPositionRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const activeButtonRef = useRef<number | null>(null);

  useEffect(() => {
    const reset = () => {
      isDraggingRef.current = false;
      activeButtonRef.current = null;
      startPositionRef.current = null;
      if (isPanning) {
        setIsPanning(false);
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const pane = target?.closest(".react-flow__pane");
      const inGraph = Boolean(target?.closest(".react-flow"));
      const onNode = Boolean(target?.closest(".react-flow__node"));
      const isPrimary = event.button === PRIMARY_BUTTON;
      const isMiddle = event.button === MIDDLE_BUTTON;

      const shouldDetectPan =
        (pane && isPrimary) || (isMiddle && inGraph);

      if (shouldDetectPan) {
        isDraggingRef.current = true;
        activeButtonRef.current = event.button;
        startPositionRef.current = { x: event.clientX, y: event.clientY };
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDraggingRef.current || !startPositionRef.current) {
        return;
      }

      const buttons = event.buttons ?? 0;
      const activeButton = activeButtonRef.current;
      if (activeButton === null) {
        reset();
        return;
      }

      const stillDragging =
        activeButton === MIDDLE_BUTTON
          ? isMiddleButtonDown(buttons)
          : isPrimaryButtonDown(buttons);

      if (!stillDragging) {
        reset();
        return;
      }

      const deltaX = Math.abs(event.clientX - startPositionRef.current.x);
      const deltaY = Math.abs(event.clientY - startPositionRef.current.y);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance > threshold && !isPanning) {
        setIsPanning(true);
      }
    };

    const handleMouseUp = () => reset();
    const handleMouseLeave = () => reset();

    window.addEventListener("mousedown", handleMouseDown, { passive: true });
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseup", handleMouseUp, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave, { passive: true });

    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [threshold, isPanning, grabMode]);

  return isPanning;
};
