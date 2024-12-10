import { fetchPoints } from "@/actions/fetchPoints";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { create, keyResolver, windowScheduler } from "@yornaath/batshit";

const pointFetcher = create({
  fetcher: async (ids: number[]) => await fetchPoints(ids),
  resolver: keyResolver("pointId"),
  scheduler: windowScheduler(10),
});

export const usePointData = (pointId?: number) => {
  const { user } = usePrivy();
  return useQuery({
    queryKey: [pointId, "point-data", user?.id],
    queryFn: () => (pointId ? pointFetcher.fetch(pointId) : null),
    gcTime: Infinity,
    staleTime: 1000 * 60 * 60,
  });
};

export const usePrefetchPoint = () => {
  const { user } = usePrivy();
  const queryClient = useQueryClient();

  return (pointId: number) =>
    queryClient.prefetchQuery({
      queryKey: [pointId, "point", user?.id],
      queryFn: () => pointFetcher.fetch(pointId),
    });
};
