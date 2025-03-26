import { fetchFeedPage } from "@/actions/fetchFeed";
import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { useFeedWorker } from "@/hooks/useFeedWorker";

export const useFeed = () => {
  const { user: privyUser, ready } = usePrivy();
  const { processPoints } = useFeedWorker();

  return useQuery({
    queryKey: ["feed", privyUser?.id],
    queryFn: async () => {
      try {
        const page = await fetchFeedPage();

        // Start processing points in the worker if we have a user
        if (page.length > 0 && privyUser?.id) {
          processPoints(page, privyUser.id);
        }

        return page;
      } catch (error) {
        return [];
      }
    },
    staleTime: 15_000, // 15 seconds - more aggressive refresh
    gcTime: 10 * 60_000,
    retry: 2,
    enabled: ready,
    refetchOnWindowFocus: true, // Enable refresh on window focus
    refetchOnMount: true, // Enable refresh on mount
    refetchOnReconnect: true,
    networkMode: "offlineFirst",
    refetchInterval: 60_000, // Refresh every minute
  });
};
