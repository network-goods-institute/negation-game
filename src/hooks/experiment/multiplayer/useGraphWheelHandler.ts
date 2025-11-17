import React from "react";
import { useReactFlow } from "@xyflow/react";

interface UseGraphWheelHandlerProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const useGraphWheelHandler = ({
  containerRef,
}: UseGraphWheelHandlerProps) => {
  const rf = useReactFlow();
  const wheelUpdateRef = React.useRef<number | null>(null);
  const pendingWheelDeltaRef = React.useRef<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  React.useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const isEditable = (el: HTMLElement | null) => {
      if (!el) return false;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT")
        return true;
      if (el.isContentEditable) return true;
      return false;
    };

    const withinCanvasBounds = (x: number, y: number) => {
      const rect = root.getBoundingClientRect();
      return (
        x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
      );
    };

    const onWheel = (event: WheelEvent) => {
      // Ignore pinch-zoom and modified scrolls
      if (event.ctrlKey || event.metaKey) return;

      // Only handle if pointer is over the canvas area (including portaled HUDs)
      if (!withinCanvasBounds(event.clientX, event.clientY)) return;

      const topEl = document.elementFromPoint(
        event.clientX,
        event.clientY
      ) as HTMLElement | null;

      // Skip when pointer is over the market side panel
      if (topEl && topEl.closest(".market-panel-base")) {
        return;
      }

      // Skip when interacting with editable controls
      if (isEditable(topEl)) return;

      // Prevent page scroll; pan viewport instead
      event.preventDefault();

      // Reverse deltas for natural trackpad scrolling direction
      pendingWheelDeltaRef.current.x += -event.deltaX;
      pendingWheelDeltaRef.current.y += -event.deltaY;

      if (wheelUpdateRef.current !== null) {
        cancelAnimationFrame(wheelUpdateRef.current);
      }

      wheelUpdateRef.current = requestAnimationFrame(() => {
        const viewport = rf.getViewport?.();
        if (!viewport) {
          pendingWheelDeltaRef.current = { x: 0, y: 0 };
          wheelUpdateRef.current = null;
          return;
        }
        const nextViewport = {
          x: viewport.x + pendingWheelDeltaRef.current.x,
          y: viewport.y + pendingWheelDeltaRef.current.y,
          zoom: viewport.zoom,
        };
        rf.setViewport?.(nextViewport, { duration: 0 });
        pendingWheelDeltaRef.current = { x: 0, y: 0 };
        wheelUpdateRef.current = null;
      });
    };

    // Capture phase to ensure we run even when overlay HUDs are above
    window.addEventListener("wheel", onWheel, {
      passive: false,
      capture: true,
    } as any);
    return () => {
      window.removeEventListener(
        "wheel",
        onWheel as any,
        { capture: true } as any
      );
      if (wheelUpdateRef.current !== null) {
        cancelAnimationFrame(wheelUpdateRef.current);
        wheelUpdateRef.current = null;
      }
      pendingWheelDeltaRef.current = { x: 0, y: 0 };
    };
  }, [rf, containerRef]);
};
