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
        const page = await fetchFeedPage();

        if (page.length > 0 && privyUser?.id) {
          processPoints(page, privyUser.id);
        }

        return page;
      } catch (error) {
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
