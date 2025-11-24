import { useCallback, useRef } from 'react';

export const usePillHandlers = (
  isConnectMode: boolean,
  buildSelectionPayload: () => { ids: string[]; positionsById: Record<string, any>; nodes: any[] },
  addPointBelow: (payload: { ids: string[]; positionsById: Record<string, any> }) => void,
  forceHidePills: () => void
) => {
  const capturedSelectionRef = useRef<string[] | null>(null);
  const pillHandledRef = useRef(false);

  const handlePillMouseDown = useCallback(() => {
    if (isConnectMode) return;
    const payload = buildSelectionPayload();
    const { ids: selection, positionsById } = payload;
    capturedSelectionRef.current = selection;
    pillHandledRef.current = true;
    addPointBelow?.({ ids: selection, positionsById });
    capturedSelectionRef.current = null;
    forceHidePills();
  }, [isConnectMode, buildSelectionPayload, addPointBelow, forceHidePills]);

  const handlePillClick = useCallback(() => {
    if (isConnectMode) return;
    if (pillHandledRef.current) {
      pillHandledRef.current = false;
      return;
    }
    const payload = buildSelectionPayload();
    const selection = (capturedSelectionRef.current && capturedSelectionRef.current.length > 0)
      ? capturedSelectionRef.current
      : payload.ids;
    const positionsById = payload.positionsById;
    addPointBelow?.({ ids: selection, positionsById });
    capturedSelectionRef.current = null;
    forceHidePills();
  }, [isConnectMode, addPointBelow, forceHidePills, buildSelectionPayload]);

  return { handlePillMouseDown, handlePillClick };
};
