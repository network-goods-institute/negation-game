import { fetchUser } from "@/actions/fetchUser";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";

export const userQueryKey = (idOrUsername?: string) => ["user", idOrUsername];

export const useUser = (idOrUsername?: string) => {
  const { user: privyUser, ready } = usePrivy();

  const id = idOrUsername || privyUser?.id;

  return useQuery({
    queryKey: userQueryKey(id),
    queryFn: async () => (id ? fetchUser(id) : null),
    enabled: ready && !!id,
  });
};
