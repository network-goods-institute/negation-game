import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Manages connection mode state for drawing edges between nodes in the graph
 * @returns Connection mode state and control functions
 */
export const useConnectionMode = () => {
  const [connectMode, setConnectMode] = useState<boolean>(false);
  const [connectAnchorId, setConnectAnchorId] = useState<string | null>(null);
  const connectAnchorRef = useRef<string | null>(null);
  const [connectCursor, setConnectCursor] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!connectAnchorId) {
      connectAnchorRef.current = null;
      setConnectCursor(null);
    }
  }, [connectAnchorId]);

  useEffect(() => {
    if (!connectMode) {
      setConnectAnchorId(null);
      connectAnchorRef.current = null;
      setConnectCursor(null);
    }
  }, [connectMode]);

  const clearConnect = useCallback(() => {
    setConnectMode(false);
    setConnectAnchorId(null);
    setConnectCursor(null);
  }, []);

  const cancelConnect = useCallback(() => {
    setConnectAnchorId(null);
    connectAnchorRef.current = null;
    setConnectCursor(null);
    setConnectMode(false);
  }, []);

  return {
    connectMode,
    setConnectMode,
    connectAnchorId,
    setConnectAnchorId,
    connectAnchorRef,
    connectCursor,
    setConnectCursor,
    clearConnect,
    cancelConnect,
  };
};
