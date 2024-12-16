import { endorse } from "@/actions/endorse";
import { useAuthenticatedMutation } from "@/mutations/useAuthenticatedMutation";
import { useInvalidateRelatedPoints } from "@/queries/usePointData";
import { userQueryKey } from "@/queries/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";

export const useEndorse = () => {
  const queryClient = useQueryClient();
  const { user } = usePrivy();
  const invalidateRelatedPoints = useInvalidateRelatedPoints();
  return useAuthenticatedMutation({
    mutationFn: endorse,
    onSuccess: (_endorsementId, { pointId }) => {
      invalidateRelatedPoints(pointId);

      //update cred balance
      queryClient.invalidateQueries({
        queryKey: userQueryKey(user?.id),
      });
    },
  });
};
