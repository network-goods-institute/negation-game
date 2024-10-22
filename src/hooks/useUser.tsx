import { fetchUser } from "@/actions/fetchUser";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";

export const useUser = () => {
  const { user: privyUser } = usePrivy();

  return useQuery({
    queryKey: ["user", privyUser?.id],
    queryFn: async ({ queryKey: [, id] }) => (id ? fetchUser(id) : null),
  });
};
