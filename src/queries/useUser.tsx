import { fetchUser } from "@/actions/fetchUser";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";

export const userQueryKey = (idOrUsername?: string) => ["user", idOrUsername];

export const useUser = (idOrUsername?: string) => {
  const { user: privyUser, ready, authenticated } = usePrivy();

  const id = idOrUsername || privyUser?.id;

  return useQuery({
    queryKey: userQueryKey(id),
    queryFn: async () => {
      if (!id) return null;
      const result = await fetchUser(id);
      return result || null;
    },
    enabled: ready && (!!authenticated || !!idOrUsername) && !!id,
    retry: (failureCount, error) => {
      return failureCount < 3;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: 5 * 60 * 1000,
  });
};
