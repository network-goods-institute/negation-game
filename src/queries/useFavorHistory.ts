import { fetchFavorHistory } from "@/actions/fetchFavorHistory";
import { TimelineScale } from "@/lib/timelineScale";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState, useEffect } from "react";

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
  const [retryCount, setRetryCount] = useState(0);

  // Reset retry count when pointId changes
  useEffect(() => {
    setRetryCount(0);
  }, [pointId]);

  return useQuery<FavorHistoryDataPoint[]>({
    queryKey: [pointId, "favor-history", timelineScale] as const,
    queryFn: async ({ queryKey, signal }) => {
      const id = queryKey[0] as number;
      const scale = queryKey[2] as TimelineScale;

      // Check cache first - try to return immediately if possible
      const cachedData = queryClient.getQueryData<FavorHistoryDataPoint[]>([
        id,
        "favor-history",
        scale,
      ]);

      if (cachedData && cachedData.length > 0) {
        setStatusMessage(null);
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
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

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
            setRetryCount(0);
            return processedData;
          } catch (error) {
            // Handle specific timeout error
            if (
              error instanceof Error &&
              (error.name === "AbortError" || error.message === "Fetch timeout")
            ) {
              console.warn(
                `[FavorHistory] Fetch timed out for ${id}, using fallback data`
              );
              setStatusMessage("Limited history available");

              // Update retry count but return fallback data instead of throwing
              setRetryCount((prev) => Math.min(prev + 1, 3));
              return generateFallbackData(currentFavor);
            } else {
              console.error(
                `[FavorHistory] Error fetching data for ${id}:`,
                error
              );
              setStatusMessage("Error loading history");
              return generateFallbackData(currentFavor);
            }
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
          return data.map((point) => ({
            timestamp:
              point.timestamp instanceof Date
                ? point.timestamp
                : new Date(point.timestamp),
            favor: typeof point.favor === "number" ? point.favor : currentFavor,
          }));
        }
      } catch (outerError: unknown) {
        // Handle any other errors in the outer try block
        console.error(
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
      return Math.min(30000, 1000 * Math.pow(2, retryCount));
    },
    staleTime: 10_000,
    gcTime: 10 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) =>
      Math.min(1000 * Math.pow(2, attemptIndex), 30000), // Exponential backoff
    networkMode: "offlineFirst",
    meta: {
      statusMessage,
    },
  });
};
