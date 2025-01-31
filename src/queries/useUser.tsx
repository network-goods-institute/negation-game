import { fetchUser } from "@/actions/fetchUser";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";

export const userQueryKey = (privyUserId?: string) => ["user", privyUserId];

export const useUser = (userId?: string) => {
  const { user: privyUser, ready } = usePrivy();

  const id = userId || privyUser?.id;

  return useQuery({
    queryKey: userQueryKey(id),
    queryFn: async ({ queryKey: [, id] }) => (id ? fetchUser(id) : null),
    enabled: ready,
  });
};
