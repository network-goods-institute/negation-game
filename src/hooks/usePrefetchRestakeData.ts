import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { DEFAULT_TIMESCALE } from "@/constants/config";
import { usePrivy } from "@privy-io/react-auth";
import { restakerReputationQueryKey } from "@/queries/useRestakerReputation";
import { doubtForRestakeQueryKey } from "@/queries/useDoubtForRestake";
import { fetchFavorHistory } from "@/actions/fetchFavorHistory";
import { fetchRestakerReputation } from "@/actions/fetchRestakerReputation";
import { fetchRestakeForPoints } from "@/actions/fetchRestakeForPoints";
import { fetchDoubtForRestake } from "@/actions/fetchDoubtForRestake";

export const usePrefetchRestakeData = () => {
  const queryClient = useQueryClient();
  const { user } = usePrivy();

  return useCallback(async (pointId: number, negationId: number) => {
    const staleTime = 30000; // 30 seconds

    await Promise.all([
      // Favor histories
      queryClient.prefetchQuery({
        queryKey: [pointId, "favor-history", DEFAULT_TIMESCALE],
        queryFn: () => fetchFavorHistory({ pointId, scale: DEFAULT_TIMESCALE }),
        staleTime
      }),

      queryClient.prefetchQuery({
        queryKey: [negationId, "favor-history", DEFAULT_TIMESCALE],
        queryFn: () => fetchFavorHistory({ pointId: negationId, scale: DEFAULT_TIMESCALE }),
        staleTime
      }),

      // Restaker reputation
      queryClient.prefetchQuery({
        queryKey: restakerReputationQueryKey({ pointId, negationId, userId: user?.id }),
        queryFn: () => fetchRestakerReputation(pointId, negationId),
        staleTime
      }),

      // Restake data
      queryClient.prefetchQuery({
        queryKey: ["restake", pointId, negationId, user?.id],
        queryFn: () => fetchRestakeForPoints(pointId, negationId),
        staleTime
      }),

      // Doubt data  
      queryClient.prefetchQuery({
        queryKey: doubtForRestakeQueryKey({ pointId, negationId, userId: user?.id }),
        queryFn: () => fetchDoubtForRestake(pointId, negationId),
        staleTime
      })
    ]).catch(() => {
      // Silently handle any prefetch errors
      // The queries will retry when the dialog opens if needed
    });
  }, [queryClient, user?.id]);
}; 