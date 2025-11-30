import { useState, useMemo } from 'react';

export const useModeState = () => {
  const [grabMode, setGrabMode] = useState<boolean>(false);
  const [perfBoost, setPerfBoost] = useState<boolean>(false);

  const selectMode = useMemo(
    () => !grabMode,
    [grabMode]
  );

  return {
    grabMode,
    setGrabMode,
    perfBoost,
    setPerfBoost,
    selectMode,
  };
};
