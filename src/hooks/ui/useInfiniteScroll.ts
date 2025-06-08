// Create a hook to observe a sentinel element and trigger a callback when it enters view
import { useEffect, useRef } from "react";
import type { RefObject } from "react";

export function useInfiniteScroll(
  callback: () => void,
  deps: any[] = []
): RefObject<HTMLDivElement | null> {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    // Find nearest scrollable container
    const scrollContainer = sentinel.closest(
      ".overflow-auto"
    ) as HTMLElement | null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          callback();
        }
      },
      { root: scrollContainer || null, rootMargin: "0px", threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callback, ...deps]);

  return sentinelRef;
}
