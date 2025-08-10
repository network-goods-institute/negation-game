import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { pointQueryKey } from '@/queries/points/usePointData';
import { userEndorsementsQueryKey } from '@/queries/users/useUserEndorsements';
import type { ParallelRationalePointData } from '@/hooks/points/useParallelRationaleData';

/**
 * Optimizes rationale point loading by:
 * 1. Pre-populating individual point caches from batch data
 * 2. Pre-populating endorsement caches from batch data
 * This reduces duplicate API calls and makes individual queries instant
 */
export function useRationalePointsOptimization(
  pointsData: ParallelRationalePointData[],
  userId?: string
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!pointsData.length) return;

    // Pre-populate individual point queries with batch data
    pointsData.forEach((point) => {
      const pointKey = pointQueryKey({ pointId: point.pointId, userId });
      
      // Only set data if we don't have it cached already
      const existingData = queryClient.getQueryData(pointKey);
      if (!existingData) {
        queryClient.setQueryData(pointKey, point);
      }

      // Pre-populate endorsement cache if available
      if (point.opCred !== undefined && userId) {
        const endorsementKey = userEndorsementsQueryKey({ pointId: point.pointId, userId });
        const existingEndorsement = queryClient.getQueryData(endorsementKey);
        if (!existingEndorsement) {
          queryClient.setQueryData(endorsementKey, point.opCred);
        }
      }
    });
  }, [pointsData, userId, queryClient]);
}