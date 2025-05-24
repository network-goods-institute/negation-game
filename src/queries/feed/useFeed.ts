import { fetchFeedPage } from "@/actions/feed/fetchFeed";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { useFeedWorker } from "@/hooks/data/useFeedWorker";
let hasLoggedServerActionError = false;

const isServerActionError = (error: any): boolean => {
  return (
    error?.message?.includes("Failed to find Server Action") &&
    error?.message?.includes(
      "Cannot read properties of undefined (reading 'workers')"
    )
  );
};

export const useFeed = () => {
  const { user: privyUser, ready } = usePrivy();
  const { processPoints } = useFeedWorker();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["feed", privyUser?.id, ready],
    queryFn: async () => {
      try {
        const page = await fetchFeedPage();

        if (Array.isArray(page) && page.length > 0 && privyUser?.id) {
          try {
            processPoints(page, privyUser.id);
          } catch (workerError) {
            console.error("Error processing points with worker:", workerError);
          }
        }

        return page || [];
      } catch (error: any) {
        if (isServerActionError(error)) {
          if (!hasLoggedServerActionError) {
            console.error(
              "Server action error (first occurrence only):",
              error
            );
            hasLoggedServerActionError = true;
          }

          // For server action errors, we always want to retry with cached data
          // because the server might be in an inconsistent state temporarily
          const cachedData = queryClient.getQueryData([
            "feed",
            privyUser?.id,
            ready,
          ]);
          if (cachedData) {
            return cachedData;
          }
        } else {
          console.error("Error fetching feed:", error);
        }

        // Try to use cached data if available
        const cachedData = queryClient.getQueryData([
          "feed",
          privyUser?.id,
          ready,
        ]);
        if (cachedData) {
          return cachedData;
        }

        return [];
      }
    },
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    retry: (failureCount, error: any) => {
      if (isServerActionError(error) && failureCount >= 1) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000), // Exponential backoff
    enabled: ready,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
    networkMode: "offlineFirst",
    refetchInterval: 120_000,
  });
};
