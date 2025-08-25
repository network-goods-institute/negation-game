import { initUserAction } from "@/actions/users/initUserAction";
import { useAuthenticatedMutation } from "../auth/useAuthenticatedMutation";
import { userQueryKey } from "@/queries/users/useUser";
import { useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";

export const useUsernameSignup = () => {
  const queryClient = useQueryClient();
  const { user: privyUser } = usePrivy();

  return useAuthenticatedMutation({
    mutationFn: initUserAction,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      const userId = privyUser?.id || data.id;
      queryClient.setQueryData(userQueryKey(userId), data);
      if (data?.username) {
        queryClient.setQueryData(userQueryKey(data.username), data);
      }
    },
  });
};
