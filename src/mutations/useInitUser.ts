import { initUserAction } from "@/actions/initUserAction";
import { useAuthenticatedMutation } from "@/mutations/useAuthenticatedMutation";
import { userQueryKey } from "@/queries/useUser";
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
