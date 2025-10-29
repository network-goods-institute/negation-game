import { useState, useMemo } from 'react';

export const useModeState = () => {
  const [grabMode, setGrabMode] = useState<boolean>(false);
  const [perfBoost, setPerfBoost] = useState<boolean>(false);
  const [mindchangeSelectMode, setMindchangeSelectMode] = useState(false);
  const [mindchangeEdgeId, setMindchangeEdgeId] = useState<string | null>(null);
  const [mindchangeNextDir, setMindchangeNextDir] = useState<null | 'forward' | 'backward'>(null);

  const selectMode = useMemo(
    () => !mindchangeSelectMode && !grabMode,
    [mindchangeSelectMode, grabMode]
  );

  return {
    grabMode,
    setGrabMode,
    perfBoost,
    setPerfBoost,
    mindchangeSelectMode,
    setMindchangeSelectMode,
    mindchangeEdgeId,
    setMindchangeEdgeId,
    mindchangeNextDir,
    setMindchangeNextDir,
    selectMode,
  };
};
