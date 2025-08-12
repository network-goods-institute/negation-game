import { useQuery, useQueryClient } from "@tanstack/react-query";
import { validateObjectionTarget } from "@/actions/points/addObjection";

export const objectionContextsKey = (pointId?: number) =>
  ["objection-contexts", pointId] as const;

export const useObjectionContexts = (
  pointId?: number,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: objectionContextsKey(pointId),
    queryFn: () =>
      pointId
        ? validateObjectionTarget(pointId)
        : Promise.resolve({ canCreateObjection: false, availableContexts: [] }),
    enabled: (options?.enabled ?? true) && !!pointId,
    staleTime: 10 * 60 * 1000, // Keep fresh longer - objection contexts don't change often
    gcTime: 15 * 60 * 1000, // Keep in cache longer  
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch if cached
  });
};

export const usePrefetchObjectionContexts = () => {
  const queryClient = useQueryClient();
  return (pointId?: number) => {
    if (!pointId) return;
    
    // Only prefetch if we don't already have fresh data
    const existing = queryClient.getQueryData(objectionContextsKey(pointId));
    const queryState = queryClient.getQueryState(objectionContextsKey(pointId));
    const isStale = !queryState || (Date.now() - (queryState.dataUpdatedAt || 0)) > 10 * 60 * 1000;
    
    if (!existing || isStale) {
      queryClient.prefetchQuery({
        queryKey: objectionContextsKey(pointId),
        queryFn: () => validateObjectionTarget(pointId),
        staleTime: 10 * 60 * 1000,
        gcTime: 15 * 60 * 1000,
      });
    }
  };
};
