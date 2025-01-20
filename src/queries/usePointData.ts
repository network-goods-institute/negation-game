import { fetchPoints } from "@/actions/fetchPoints";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { create, keyResolver, windowScheduler } from "@yornaath/batshit";
import { useCallback } from "react";

const pointFetcher = create({
  fetcher: async (ids: number[]) => await fetchPoints(ids),
  resolver: keyResolver("pointId"),
  scheduler: windowScheduler(20),
});

export type PointData = Awaited<ReturnType<typeof fetchPoints>>[number];

export const pointQueryKey = ({
  pointId,
  userId,
}: {
  pointId?: number;
  userId?: string;
}) => [pointId, "point", userId];

export const usePointData = (pointId?: number) => {
  const { user } = usePrivy();
  return useQuery({
    queryKey: pointQueryKey({ pointId, userId: user?.id }),
    queryFn: () => (pointId ? pointFetcher.fetch(pointId) : null),
    gcTime: Infinity,
    staleTime: 1000 * 60 * 5,
  });
};

export const usePrefetchPoint = () => {
  const { user } = usePrivy();
  const queryClient = useQueryClient();

  return (pointId: number) =>
    queryClient.prefetchQuery({
      queryKey: pointQueryKey({ pointId, userId: user?.id }),
      queryFn: () => pointFetcher.fetch(pointId),
    });
};

export const useSetPointData = () => {
  const queryClient = useQueryClient();

  return useCallback(
    (
      key: {
        pointId: number;
        userId?: string;
      },
      data: PointData
    ) => queryClient.setQueryData(pointQueryKey(key), data),
    [queryClient]
  );
};

export const useInvalidateRelatedPoints = () => {
  const queryClient = useQueryClient();
  const { user } = usePrivy();

  return useCallback(
    (pointId: number) => {
      const pointData: PointData | undefined =
        queryClient.getQueryData(
          pointQueryKey({ pointId, userId: user?.id })
        ) ?? queryClient.getQueryData(pointQueryKey({ pointId }));
      queryClient.invalidateQueries({ queryKey: [pointId] });
      if (!pointData) return;

      pointData.negationIds.forEach((negationId) => {
        queryClient.invalidateQueries({ queryKey: [negationId] });
      });
    },
    [queryClient, user?.id]
  );
};
