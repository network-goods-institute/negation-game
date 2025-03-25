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

  return useCallback(
    async (pointId: number, negationId: number) => {
      const staleTime = 10000;
      const timelineScales = [DEFAULT_TIMESCALE, "1W", "1M"] as const; // Prefetch multiple scales

      try {
        // Prefetch in parallel but handle each type of data separately
        // This way, if one fails, the others can still succeed

        // 1. Prefetch favor histories for both points with multiple scales
        const favorPromises = timelineScales.flatMap((scale) => [
          queryClient.prefetchQuery({
            queryKey: [pointId, "favor-history", scale],
            queryFn: () => fetchFavorHistory({ pointId, scale }),
            staleTime,
          }),
          queryClient.prefetchQuery({
            queryKey: [negationId, "favor-history", scale],
            queryFn: () => fetchFavorHistory({ pointId: negationId, scale }),
            staleTime,
          }),
        ]);

        // 2. Prefetch restaker reputation
        const reputationPromise = queryClient.prefetchQuery({
          queryKey: restakerReputationQueryKey(pointId, negationId, user?.id),
          queryFn: () => fetchRestakerReputation(pointId, negationId),
          staleTime,
        });

        // 3. Prefetch restake data
        const restakePromise = queryClient.prefetchQuery({
          queryKey: ["restake", pointId, negationId, user?.id],
          queryFn: () => fetchRestakeForPoints(pointId, negationId),
          staleTime,
        });

        // 4. Prefetch doubt data
        const doubtPromise = queryClient.prefetchQuery({
          queryKey: doubtForRestakeQueryKey({
            pointId,
            negationId,
            userId: user?.id,
          }),
          queryFn: () => fetchDoubtForRestake(pointId, negationId),
          staleTime,
        });

        // Wait for all prefetch operations to complete
        await Promise.all([
          // If any individual operation fails, we still continue with the others
          Promise.allSettled(favorPromises),
          reputationPromise,
          restakePromise,
          doubtPromise,
        ]);
      } catch (error) {
        console.warn(
          `[Prefetch] Error prefetching restake data for points ${pointId} and ${negationId}:`,
          error
        );
        // Silently handle any prefetch errors
        // The queries will retry when needed
      }
    },
    [queryClient, user?.id]
  );
};
