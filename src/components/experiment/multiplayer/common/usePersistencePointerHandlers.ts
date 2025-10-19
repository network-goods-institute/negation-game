import { useCallback, useEffect, useRef, useState } from 'react';
import { useReactFlow } from '@xyflow/react';

const INTERACTIVE_TARGET_SELECTOR = 'button, [role="button"], a, input, textarea, select, [data-interactive="true"]';

interface UsePersistencePointerHandlersProps {
  grabMode: boolean;
}

export const usePersistencePointerHandlers = ({ grabMode }: UsePersistencePointerHandlersProps) => {
  const reactFlow = useReactFlow();
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const panSessionRef = useRef<{
    pointerId: number;
    lastX: number;
    lastY: number;
    viewport: { x: number; y: number; zoom: number };
  } | null>(null);
  const pointerUpdateRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const stopPanSession = useCallback(() => {
    panSessionRef.current = null;
    if (pointerUpdateRef.current !== null) {
      cancelAnimationFrame(pointerUpdateRef.current);
      pointerUpdateRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pointerUpdateRef.current !== null) {
        cancelAnimationFrame(pointerUpdateRef.current);
      }
    };
  }, []);

  const handlePersistencePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!reactFlow) {
      return;
    }

    const target = event.target as HTMLElement | null;
    const isMiddleButton = event.button === 1;
    const isTouchGesture = event.pointerType === 'touch';
    const isSpaceDrag = event.button === 0 && isSpacePressed;
    const isHandDrag = grabMode && event.button === 0 && event.pointerType === 'mouse';

    if (isHandDrag && target?.closest(INTERACTIVE_TARGET_SELECTOR)) {
      return;
    }

    if (!(isMiddleButton || isSpaceDrag || isTouchGesture || isHandDrag)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const viewport = reactFlow?.getViewport();
    if (!viewport) {
      return;
    }

    panSessionRef.current = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
      viewport,
    };

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch { }
  }, [grabMode, isSpacePressed, reactFlow]);

  const handlePersistencePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const session = panSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();

    const deltaX = event.clientX - session.lastX;
    const deltaY = event.clientY - session.lastY;

    session.lastX = event.clientX;
    session.lastY = event.clientY;

    const nextViewport = {
      x: session.viewport.x + deltaX,
      y: session.viewport.y + deltaY,
      zoom: session.viewport.zoom,
    };

    session.viewport = nextViewport;

    if (pointerUpdateRef.current !== null) {
      cancelAnimationFrame(pointerUpdateRef.current);
    }

    pointerUpdateRef.current = requestAnimationFrame(() => {
      reactFlow?.setViewport(nextViewport, { duration: 0 });
      pointerUpdateRef.current = null;
    });
  }, [reactFlow]);

  const handlePersistencePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const session = panSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch { }

    stopPanSession();
  }, [stopPanSession]);

  const handlePersistencePointerLeave = useCallback(() => {
    stopPanSession();
  }, [stopPanSession]);

  return {
    handlePersistencePointerDown,
    handlePersistencePointerMove,
    handlePersistencePointerUp,
    handlePersistencePointerLeave,
  };
};
