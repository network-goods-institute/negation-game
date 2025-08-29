import { useMemo, useRef } from "react";
import { useReactFlow } from "@xyflow/react";

interface UseEdgePerformanceOptimizationOptions {
  sourceId: string;
  targetId: string;
  sourceX: number | null;
  sourceY: number | null;
  targetX: number | null;
  targetY: number | null;
}

export const useEdgePerformanceOptimization = ({
  sourceId,
  targetId,
  sourceX,
  sourceY,
  targetX,
  targetY,
}: UseEdgePerformanceOptimizationOptions) => {
  const rf = useReactFlow();

  // Track position update frequency to detect rapid updates (network-aware)
  const updateFrequencyTracker = useRef({
    timestamps: [] as number[],
    maxSamples: 5,
    lastPositions: { sourceX, sourceY, targetX, targetY },
  });

  const isHighFrequencyUpdates = useMemo(() => {
    const now = Date.now();
    const tracker = updateFrequencyTracker.current;

    // Check if positions actually changed
    const prev = tracker.lastPositions;
    const positionsChanged =
      (sourceX ?? 0) !== (prev.sourceX ?? 0) ||
      (sourceY ?? 0) !== (prev.sourceY ?? 0) ||
      (targetX ?? 0) !== (prev.targetX ?? 0) ||
      (targetY ?? 0) !== (prev.targetY ?? 0);

    if (!positionsChanged)
      return (
        tracker.timestamps.length > 0 &&
        tracker.timestamps[tracker.timestamps.length - 1] > now - 100
      );

    tracker.timestamps.push(now);
    tracker.lastPositions = { sourceX, sourceY, targetX, targetY };

    // Keep only recent samples
    if (tracker.timestamps.length > tracker.maxSamples) {
      tracker.timestamps.shift();
    }

    if (tracker.timestamps.length < 2) return false;

    const intervals = [];
    for (let i = 1; i < tracker.timestamps.length; i++) {
      intervals.push(tracker.timestamps[i] - tracker.timestamps[i - 1]);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    return avgInterval < 50; // Updates faster than 20fps = likely dragging
  }, [sourceX, sourceY, targetX, targetY]);

  // Always get fresh nodes - positions change frequently
  const sourceNode = rf.getNode(sourceId);
  const targetNode = rf.getNode(targetId);

  return {
    isHighFrequencyUpdates,
    sourceNode,
    targetNode,
    // Ellipses always ON for proper visual layering
    shouldRenderEllipses: true,
  };
};
