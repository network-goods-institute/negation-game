import { useState, useRef, useEffect } from 'react';

/**
 * Manages edge selection and hover state for the graph
 * @returns Edge selection state and control functions
 */
export const useEdgeSelection = () => {
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const edgeRevealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (edgeRevealTimeoutRef.current) {
        clearTimeout(edgeRevealTimeoutRef.current);
        edgeRevealTimeoutRef.current = null;
      }
    };
  }, []);

  /**
   * Temporarily reveal an edge for a specified duration
   * @param edgeId - The edge to reveal
   * @param duration - How long to show the edge (ms), defaults to 3500ms
   */
  const revealEdgeTemporarily = (edgeId: string, duration: number = 3500) => {
    setHoveredEdgeId(edgeId);
    setSelectedEdgeId(edgeId);

    if (edgeRevealTimeoutRef.current) {
      clearTimeout(edgeRevealTimeoutRef.current);
    }

    edgeRevealTimeoutRef.current = setTimeout(() => {
      setHoveredEdgeId((current) => (current === edgeId ? null : current));
      setSelectedEdgeId((current) => (current === edgeId ? null : current));
    }, duration);
  };

  return {
    hoveredEdgeId,
    setHoveredEdgeId,
    selectedEdgeId,
    setSelectedEdgeId,
    revealEdgeTemporarily,
  };
};
