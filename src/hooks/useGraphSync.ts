"use client";

import { useMemo, useEffect } from "react";
import type { ViewpointGraph } from "@/atoms/viewpointAtoms";

/**
 * Provides a debounced setter for syncing the graph state.
 */
export function useGraphSync(
  setLocalGraph?: (graph: ViewpointGraph) => void
): (graph: ViewpointGraph) => void {
  const debouncedSetLocalGraph = useMemo(() => {
    if (!setLocalGraph) {
      const noop = () => {};
      // @ts-ignore
      noop.cancel = () => {};
      return noop;
    }

    let timeout: NodeJS.Timeout | null = null;
    const debounced = (graph: ViewpointGraph) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        setLocalGraph(graph);
        timeout = null;
      }, 250);
    };
    debounced.cancel = () => {
      if (timeout) clearTimeout(timeout);
      timeout = null;
    };
    return debounced;
  }, [setLocalGraph]);

  useEffect(() => {
    return () => {
      if ((debouncedSetLocalGraph as any).cancel) {
        (debouncedSetLocalGraph as any).cancel();
      }
    };
  }, [debouncedSetLocalGraph]);

  return debouncedSetLocalGraph;
}
