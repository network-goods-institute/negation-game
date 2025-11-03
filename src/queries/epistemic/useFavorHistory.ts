import { fetchFavorHistory } from "@/actions/feed/fetchFavorHistory";
import { TimelineScale } from "@/lib/negation-game/timelineScale";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";import { logger } from "@/lib/logger";

export type FavorHistoryDataPoint = {
  timestamp: Date;
  favor: number;
};

function generateFallbackData(currentFavor: number): FavorHistoryDataPoint[] {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

  return [
    { timestamp: dayAgo, favor: currentFavor },
    { timestamp: now, favor: currentFavor },
  ];
}

export const useFavorHistory = ({
  pointId,
  timelineScale,
}: {
  pointId: number;
  timelineScale: TimelineScale;
}) => {
  const queryClient = useQueryClient();
  const [statusMessage, setStatusMessage] = useState<string | null>(
    "Limited history available"
  );

  return useQuery<FavorHistoryDataPoint[]>({
    queryKey: [pointId, "favor-history", timelineScale] as const,
    // Disable the query for invalid pointIds but always call the hook
    enabled: pointId >= 0,
    queryFn: async ({ queryKey }) => {
      const id = queryKey[0] as number;
      const scale = queryKey[2] as TimelineScale;

      // Return empty array for invalid points - this code won't run if enabled: false
      if (id < 0) {
        return [];
      }

      // Check cache first - try to return immediately if possible
      const cachedData = queryClient.getQueryData<FavorHistoryDataPoint[]>([
        id,
        "favor-history",
        scale,
      ]);

      if (cachedData && cachedData.length > 0) {
        setStatusMessage(null);
        // Ensure we have at least 2 points to avoid single dots
        if (cachedData.length === 1) {
          return [
            {
              timestamp: new Date(
                cachedData[0].timestamp.getTime() - 24 * 60 * 60 * 1000
              ),
              favor: cachedData[0].favor,
            },
            cachedData[0],
          ];
        }
        return cachedData;
      }

      try {
        // Get point data for current favor value as fallback
        const pointData = queryClient.getQueryData<{ favor: number }>([
          id,
          "point",
          undefined,
        ]);
        const currentFavor = pointData?.favor ?? 50;

        if (typeof window !== "undefined") {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout - more generous

            // Create a fetch that can be aborted
            const data = await Promise.race([
              fetchFavorHistory({ pointId: id, scale }),
              new Promise<never>((_, reject) => {
                setTimeout(() => {
                  reject(new Error("Fetch timeout"));
                }, 5000);
              }),
            ]);

            clearTimeout(timeoutId);

            if (!data || !Array.isArray(data) || data.length === 0) {
              setStatusMessage("Limited history available");
              return generateFallbackData(currentFavor);
            }

            const processedData = data.map((point) => ({
              timestamp:
                point.timestamp instanceof Date
                  ? point.timestamp
                  : new Date(point.timestamp),
              favor:
                typeof point.favor === "number" ? point.favor : currentFavor,
            }));

            setStatusMessage(null);

            // Ensure we have at least 2 points to avoid single dots
            if (processedData.length === 1) {
              return [
                {
                  timestamp: new Date(
                    processedData[0].timestamp.getTime() - 24 * 60 * 60 * 1000
                  ),
                  favor: processedData[0].favor,
                },
                processedData[0],
              ];
            }

            return processedData;
          } catch (error: unknown) {
            // Handle specific timeout error
            if (
              error instanceof Error &&
              (error.name === "AbortError" || error.message === "Fetch timeout")
            ) {
              logger.warn(
                `[FavorHistory] Fetch timed out for ${id}, using fallback data`
              );
              setStatusMessage("Limited history available");
            } else {
              logger.error(
                `[FavorHistory] Error fetching data for ${id}:`,
                error
              );
              setStatusMessage("Error loading history");
            }

            return generateFallbackData(currentFavor);
          }
        }
        // Server-side rendering path (no window)
        else {
          const data = await fetchFavorHistory({ pointId: id, scale });

          if (!data || !Array.isArray(data) || data.length === 0) {
            setStatusMessage("Limited history available");
            return generateFallbackData(currentFavor);
          }

          setStatusMessage(null);
          const processedData = data.map((point) => ({
            timestamp:
              point.timestamp instanceof Date
                ? point.timestamp
                : new Date(point.timestamp),
            favor: typeof point.favor === "number" ? point.favor : currentFavor,
          }));

          // Ensure we have at least 2 points to avoid single dots
          if (processedData.length === 1) {
            return [
              {
                timestamp: new Date(
                  processedData[0].timestamp.getTime() - 24 * 60 * 60 * 1000
                ),
                favor: processedData[0].favor,
              },
              processedData[0],
            ];
          }

          return processedData;
        }
      } catch (outerError: unknown) {
        // Handle any other errors in the outer try block
        logger.error(
          `[FavorHistory] Unexpected error for pointId ${id}:`,
          outerError
        );
        setStatusMessage("Error loading history");
        return generateFallbackData(50);
      }
    },
    placeholderData: keepPreviousData,
    refetchInterval: (data) => {
      // If we have real data (more than 2 points), use standard refresh
      if (data && Array.isArray(data) && data.length > 2) {
        return 30000; // Regular 30s refresh
      }
      // If we only have fallback data, use exponential backoff
      return Math.min(
        30000,
        1000 *
          Math.pow(
            2,
            queryClient.getQueryState([pointId, "favor-history", timelineScale])
              ?.fetchFailureCount || 0
          )
      );
    },
    staleTime: 10_000,
    gcTime: 10 * 60 * 1000,
    retry: 5,
    retryDelay: (attemptIndex) =>
      Math.min(1000 * Math.pow(2, attemptIndex), 30000), // Exponential backoff
    networkMode: "offlineFirst",
    meta: {
      statusMessage,
    },
  });
};
