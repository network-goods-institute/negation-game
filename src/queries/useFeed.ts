import { fetchFeedPage } from "@/actions/fetchFeed";
import { useSetPointData } from "@/queries/usePointData";
import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";

export const useFeed = () => {
  const { user: privyUser, ready } = usePrivy();
  const setPointData = useSetPointData();

  return useQuery({
    queryKey: ["feed", privyUser?.id],
    queryFn: async () => {
      const page = await fetchFeedPage();

      if (page.length > 0 && privyUser?.id) {
        const batchSize = 10;
        const batches = Math.ceil(page.length / batchSize);

        for (let i = 0; i < batches; i++) {
          const start = i * batchSize;
          const end = Math.min(start + batchSize, page.length);
          const batch = page.slice(start, end);

          for (const point of batch) {
            const transformedPoint = {
              ...point,
              restakesByPoint: point.restakesByPoint || 0,
              slashedAmount: point.slashedAmount || 0,
              doubtedAmount: point.doubtedAmount || 0,
              totalRestakeAmount: point.totalRestakeAmount || 0,
              isCommand: point.isCommand || false,
              isPinned: false,
              doubt: point.doubt || {
                id: 0,
                amount: 0,
                userAmount: 0,
                isUserDoubt: false,
              },
            };

            setPointData(
              { pointId: point.pointId, userId: privyUser.id },
              transformedPoint
            );
          }

          // Only yield to main thread if we have more batches and every 2 batches
          if (i < batches - 1 && i % 2 === 1) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }
      }

      return page;
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    retry: false,
    enabled: ready,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    networkMode: "offlineFirst",
  });
};
