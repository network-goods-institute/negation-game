import { fetchUser } from "@/actions/fetchUser";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";

export const userQueryKey = (privyUserId?: string) => ["user", privyUserId];

export const useUser = () => {
  const { user: privyUser, ready } = usePrivy();

  return useQuery({
    queryKey: userQueryKey(privyUser?.id),
    queryFn: async ({ queryKey: [, id] }) => (id ? fetchUser(id) : null),
    enabled: ready,
  });
};
