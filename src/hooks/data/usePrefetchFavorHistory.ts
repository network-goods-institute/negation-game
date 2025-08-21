import { useState, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Hook to prefetch and cache favor history for a given point ID.
 * - Triggers onPrefetch(id) to preload point data.
 * - Uses React Query client to store fetched history under [pointId, 'favor-history', '1W'].
 * - Ensures it only runs once per component lifecycle.
 */
export function usePrefetchFavorHistory(
  pointId: number | null,
  onPrefetch: (id: number) => void
) {
  const queryClient = useQueryClient();
  const [hasStarted, setHasStarted] = useState(false);
  const cacheKey = useMemo(
    () => (pointId != null ? [pointId, "favor-history", "1W"] : null),
    [pointId]
  );

  const loadHistory = useCallback(() => {
    if (pointId == null || hasStarted) return;
    setHasStarted(true);
    if (!cacheKey) return;
    const existing = queryClient.getQueryData(cacheKey);
    if (existing) return;
    import("@/actions/feed/fetchFavorHistory")
      .then(({ fetchFavorHistory }) =>
        fetchFavorHistory({ pointId, scale: "1W" })
      )
      .then((data) => {
        if (data) {
          queryClient.setQueryData(cacheKey, data);
        }
      })
      .catch((error) => {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            `[usePrefetchFavorHistory] Failed to fetch favor history for ${pointId}:`,
            error
          );
        }
      });
  }, [pointId, hasStarted, cacheKey, queryClient]);

  return loadHistory;
}
