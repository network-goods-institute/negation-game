import { initUserAction } from "@/actions/users/initUserAction";
import { useAuthenticatedMutation } from "../auth/useAuthenticatedMutation";
import { userQueryKey } from "@/queries/users/useUser";
import { useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";

export const useInitUser = () => {
  const queryClient = useQueryClient();
  const { user: privyUser } = usePrivy();
  
  return useAuthenticatedMutation({
    mutationFn: initUserAction,
    onSuccess: (data) => {
      // Invalidate all user queries to ensure fresh data
      queryClient.invalidateQueries({
        queryKey: ["user"],
      });
      
      // Set the new user data directly in the cache for immediate UI update
      const userId = privyUser?.id || data.id;
      queryClient.setQueryData(userQueryKey(userId), data);
    },
  });
};
