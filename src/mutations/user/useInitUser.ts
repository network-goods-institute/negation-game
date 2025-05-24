import { initUserAction } from "@/actions/users/initUserAction";
import { useAuthenticatedMutation } from "../auth/useAuthenticatedMutation";
import { userQueryKey } from "@/queries/users/useUser";
import { useQueryClient } from "@tanstack/react-query";

export const useInitUser = () => {
  const queryClient = useQueryClient();
  return useAuthenticatedMutation({
    mutationFn: initUserAction,
    onSuccess: ({ id }) => {
      queryClient.invalidateQueries({
        queryKey: userQueryKey(id),
      });
    },
  });
};
