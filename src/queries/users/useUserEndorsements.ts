import { fetchUserEndorsements } from "@/actions/endorsements/fetchUserEndorsements";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { create, keyResolver, windowScheduler } from "@yornaath/batshit";
import memoize from "memoize";

const endorsementsFetcher = memoize((userId: string) =>
  create({
    fetcher: async (ids: number[]) => await fetchUserEndorsements(userId, ids),
    resolver: keyResolver("pointId"),
    scheduler: windowScheduler(2),
  })
);

export type EndorsementData = Awaited<
  ReturnType<typeof fetchUserEndorsements>
>[number];

export const userEndorsementsQueryKey = ({
  pointId,
  userId,
}: {
  pointId?: number;
  userId?: string;
}) => [pointId, "endorsements", userId];

export const useUserEndorsement = (
  userId?: string,
  pointId?: number,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: userEndorsementsQueryKey({ pointId, userId }),
    queryFn: () =>
      pointId && userId
        ? endorsementsFetcher(userId)
            .fetch(pointId)
            .then(({ cred }) => cred)
        : null,
    gcTime: Infinity,
    staleTime: 1000 * 60 * 10, // Longer stale time - endorsements don't change often
    refetchOnWindowFocus: false, // Don't refetch gold borders on window focus
    refetchOnMount: false, // Don't refetch if we have cached data
    enabled: options?.enabled ?? true,
  });
};

export const usePrefetchUserEndorsements = () => {
  const queryClient = useQueryClient();

  return (userId: string, pointId: number) =>
    queryClient.prefetchQuery({
      queryKey: userEndorsementsQueryKey({ pointId, userId }),
      queryFn: () =>
        endorsementsFetcher(userId)
          .fetch(pointId)
          .then(({ cred }) => cred),
    });
};
