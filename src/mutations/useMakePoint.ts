import { makePoint } from "@/actions/makePoint";
import { useAuthenticatedMutation } from "@/mutations/useAuthenticatedMutation";
import { userQueryKey } from "@/queries/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";

export const useMakePoint = () => {
  const queryClient = useQueryClient();
  const { user } = usePrivy();

  return useAuthenticatedMutation({
    mutationFn: makePoint,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["feed"],
      });
      //update cred balance
      queryClient.invalidateQueries({
        queryKey: userQueryKey(user?.id),
      });
    },
  });
};
