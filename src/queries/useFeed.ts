import { fetchFeedPage } from "@/actions/fetchFeed";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { useFeedWorker } from "@/hooks/useFeedWorker";

export const useFeed = () => {
  const { user: privyUser, ready } = usePrivy();
  const { processPoints } = useFeedWorker();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["feed", privyUser?.id],
    queryFn: async () => {
      try {
        if (process.env.NODE_ENV === "development") {
          console.log(
            `%c[FEED] Fetching feed for user ${privyUser?.id?.substring(0, 8)}...`,
            "color: #FF9800; font-weight: bold;"
          );
          console.time("[FEED] Fetch time");
        }

        const page = await fetchFeedPage();

        if (process.env.NODE_ENV === "development") {
          console.timeEnd("[FEED] Fetch time");
          console.log(
            `%c[FEED] Received ${page.length} items`,
            "color: #2196F3; font-weight: bold;"
          );
        }

        if (page.length > 0 && privyUser?.id) {
          processPoints(page, privyUser.id);
        }

        return page;
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error(
            `%c[FEED] Error fetching feed:`,
            "color: #F44336; font-weight: bold;",
            error
          );
        }

        const cachedData = queryClient.getQueryData(["feed", privyUser?.id]);
        if (cachedData) {
          return cachedData;
        }

        return [];
      }
    },
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
    enabled: ready,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
    networkMode: "offlineFirst",
    refetchInterval: 120_000,
  });
};
