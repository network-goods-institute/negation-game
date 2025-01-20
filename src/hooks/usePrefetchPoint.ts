import { useQueryClient } from '@tanstack/react-query';
import { pointQueryKey } from '@/queries/usePointData';
import { pointNegationsQueryKey } from '@/queries/usePointNegations';
import { usePrivy } from '@privy-io/react-auth';
import { fetchPoint } from '@/actions/fetchPoint';
import { fetchPointNegations } from '@/actions/fetchPointNegations';

export const usePrefetchPoint = () => {
  const queryClient = useQueryClient();
  const { user } = usePrivy();

  return (pointId: number) => {
    // Prefetch both point and negations in parallel
    Promise.all([
      queryClient.prefetchQuery({
        queryKey: pointQueryKey({ pointId, userId: user?.id }),
        queryFn: () => fetchPoint(pointId),
      }),
      queryClient.prefetchQuery({
        queryKey: pointNegationsQueryKey({ pointId, userId: user?.id }),
        queryFn: () => fetchPointNegations(pointId).catch(() => {
          // If negations fetch fails, silently ignore - it will retry when component mounts
          return [];
        }),
      })
    ]).catch(() => {
      // Ignore any Promise.all errors - individual promises handle their own errors
    });
  };
}; 