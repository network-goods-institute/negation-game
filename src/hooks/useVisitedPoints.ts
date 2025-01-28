import { useCallback, useState } from "react";

export function useVisitedPoints() {
  const [visitedPoints, setVisitedPoints] = useState<Set<number>>(() => {
    if (typeof window === "undefined") return new Set();
    const stored = localStorage.getItem("visitedPoints");
    return new Set(stored ? JSON.parse(stored) : []);
  });

  const markPointAsRead = useCallback((pointId: number) => {
    setVisitedPoints((prev) => {
      const next = new Set(prev);
      next.add(pointId);
      localStorage.setItem("visitedPoints", JSON.stringify(Array.from(next)));
      return next;
    });
  }, []); // Empty dependency array ensures stable function reference

  return { visitedPoints, markPointAsRead };
}
