import { fetchPoints } from "@/actions/points/fetchPoints";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { create, keyResolver, windowScheduler } from "@yornaath/batshit";
import { useCallback } from "react";

export const pointFetcher = create({
  fetcher: async (ids: number[]) => {
    const points = await fetchPoints(ids);
    return points.map((point) => ({
      ...point,
      isCommand: point.isCommand || false,
      pinnedByCommandId: point.pinnedByCommandId || null,
    }));
  },
  resolver: keyResolver("pointId"),
  scheduler: windowScheduler(2),
});

export type PointData = Awaited<ReturnType<typeof fetchPoints>>[number];

export const pointQueryKey = (params?: { pointId?: number; userId?: string }) =>
  ["point", params?.pointId, { userId: params?.userId }] as const;

export const usePointData = (pointId?: number) => {
  const { user } = usePrivy();

  return useQuery<PointData | null, Error>({
    queryKey: pointQueryKey({ pointId, userId: user?.id }),
    queryFn: () => (pointId ? pointFetcher.fetch(pointId) : null),
    gcTime: 15 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    networkMode: "offlineFirst",
    retry: 3,
    enabled: !!pointId,
  });
};

export const usePrefetchPoint = () => {
  const { user } = usePrivy();
  const queryClient = useQueryClient();

  return useCallback(
    (pointId: number) => {
      const existingData = queryClient.getQueryData(
        pointQueryKey({ pointId, userId: user?.id })
      );

      queryClient.prefetchQuery<PointData>({
        queryKey: pointQueryKey({ pointId, userId: user?.id }),
        queryFn: () => pointFetcher.fetch(pointId),
        staleTime: 60 * 1000,
        gcTime: existingData ? 0 : 10 * 60 * 1000,
      });
    },
    [queryClient, user?.id]
  );
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

      queryClient.invalidateQueries({
        queryKey: pointQueryKey({ pointId, userId: user?.id }),
        exact: false,
      });

      queryClient.invalidateQueries({
        queryKey: ["point-negations", pointId],
        exact: false,
      });

      queryClient.invalidateQueries({
        queryKey: [pointId, "favor-history"],
        exact: false,
      });

      if (!pointData) return;

      pointData.negationIds.forEach((negationId) => {
        queryClient.invalidateQueries({
          queryKey: pointQueryKey({ pointId: negationId, userId: user?.id }),
          exact: false,
        });
        queryClient.invalidateQueries({
          queryKey: ["point-negations", negationId],
          exact: false,
        });
        queryClient.invalidateQueries({
          queryKey: [negationId, "favor-history"],
          exact: false,
        });
      });
    },
    [queryClient, user?.id]
  );
};
