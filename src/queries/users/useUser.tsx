import { fetchUser } from "@/actions/users/fetchUser";
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
    // Inherit optimized settings from QueryClient defaults
    // staleTime: 15 * 60 * 1000 (from provider)
    // retry: 1 (from provider)
    // retryDelay: 500 (from provider)
  });
};
