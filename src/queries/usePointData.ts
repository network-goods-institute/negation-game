import { fetchPoints } from "@/actions/fetchPoints";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { create, keyResolver, windowScheduler } from "@yornaath/batshit";
import { useCallback } from "react";

const pointFetcher = create({
  fetcher: async (ids: number[]) => {
    const points = await fetchPoints(ids);
    return points.map((point) => ({
      ...point,
      isCommand: point.isCommand || false,
      pinnedByCommandId: point.pinnedByCommandId || null,
    }));
  },
  resolver: keyResolver("pointId"),
  scheduler: windowScheduler(10),
});

export type PointData = Awaited<ReturnType<typeof fetchPoints>>[number];

type PointQueryKey = readonly [number | undefined, "point", string | undefined];

export const pointQueryKey = ({
  pointId,
  userId,
}: {
  pointId?: number;
  userId?: string;
}): PointQueryKey => [pointId, "point", userId];

export const usePointData = (pointId?: number) => {
  const { user } = usePrivy();

  return useQuery<PointData | null, Error>({
    queryKey: pointQueryKey({ pointId, userId: user?.id }),
    queryFn: () => (pointId ? pointFetcher.fetch(pointId) : null),
    gcTime: 10 * 60 * 1000,
    staleTime: 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    networkMode: "offlineFirst",
    retry: 3,
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

      queryClient.prefetchQuery({
        queryKey: ["point-negations", pointId, user?.id],
        queryFn: async () => {
          const { fetchPointNegations } = await import(
            "@/actions/fetchPointNegations"
          );
          return fetchPointNegations(pointId);
        },
        staleTime: 60 * 1000,
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
