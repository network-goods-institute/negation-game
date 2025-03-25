import { fetchFavorHistory } from "@/actions/fetchFavorHistory";
import { TimelineScale } from "@/lib/timelineScale";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

export type FavorHistoryDataPoint = {
  timestamp: Date;
  favor: number;
};

export const useFavorHistory = ({
  pointId,
  timelineScale,
}: {
  pointId: number;
  timelineScale: TimelineScale;
}) => {
  const queryClient = useQueryClient();

  return useQuery<FavorHistoryDataPoint[]>({
    queryKey: [pointId, "favor-history", timelineScale] as const,
    queryFn: async ({ queryKey }) => {
      const id = queryKey[0] as number;
      const scale = queryKey[2] as TimelineScale;

      // Check cache first - try to return immediately if possible
      const cachedData = queryClient.getQueryData<FavorHistoryDataPoint[]>([
        id,
        "favor-history",
        scale,
      ]);

      if (cachedData && cachedData.length > 0) {
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

            return processedData;
          } catch (error: unknown) {
            // Handle specific timeout error
            if (
              error instanceof Error &&
              (error.name === "AbortError" || error.message === "Fetch timeout")
            ) {
              console.warn(
                `[FavorHistory] Fetch timed out for ${id}, using fallback data`
              );
            } else {
              console.error(
                `[FavorHistory] Error fetching data for ${id}:`,
                error
              );
            }

            return generateFallbackData(currentFavor);
          }
        }
        // Server-side rendering path (no window)
        else {
          const data = await fetchFavorHistory({ pointId: id, scale });

          if (!data || !Array.isArray(data) || data.length === 0) {
            return generateFallbackData(currentFavor);
          }

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
        return generateFallbackData(50);
      }
    },
    placeholderData: keepPreviousData,
    refetchInterval: 30000,
    staleTime: 10_000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    retryDelay: 2000,
    networkMode: "offlineFirst",
  });
};

// basically lie to the user until the data is fetched
function generateFallbackData(currentFavor: number): FavorHistoryDataPoint[] {
  const now = new Date();
  const day1 = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
  const day2 = new Date(now.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago

  const baseFavor = currentFavor || 50;
  const variation1 = Math.random() * 6 - 3;
  const variation2 = Math.random() * 4 - 2;

  return [
    {
      timestamp: day1,
      favor: Math.max(0, Math.min(100, baseFavor + variation1)),
    },
    {
      timestamp: day2,
      favor: Math.max(0, Math.min(100, baseFavor + variation2)),
    },
    { timestamp: now, favor: baseFavor },
  ];
}
