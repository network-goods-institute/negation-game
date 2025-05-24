import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";
import { fetchPointById } from "@/actions/points/fetchPointById";
import type { PointData } from "./usePointData";

export const pointByIdQueryKey = (params?: {
  pointId?: number;
  userId?: string;
}) => ["pointById", params?.pointId, { userId: params?.userId }] as const;

/**
 * Fetches point data solely by its ID, without space context.
 * Suitable for contexts like NegateDialog where the specific space isn't known or relevant.
 */
export const usePointDataById = (pointId?: number) => {
  const { user } = usePrivy();

  return useQuery<PointData | null, Error>({
    queryKey: pointByIdQueryKey({ pointId, userId: user?.id }),
    queryFn: () => (pointId ? fetchPointById(pointId) : Promise.resolve(null)),
    gcTime: 10 * 60 * 1000,
    staleTime: 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    networkMode: "offlineFirst",
    retry: 3,
    enabled: !!pointId,
  });
};
