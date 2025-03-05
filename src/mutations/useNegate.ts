import { negate } from "@/actions/negate";
import { useAuthenticatedMutation } from "@/mutations/useAuthenticatedMutation";
import { useInvalidateRelatedPoints } from "@/queries/usePointData";
import { userQueryKey } from "@/queries/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";

export const useNegate = () => {
  const queryClient = useQueryClient();
  const { user } = usePrivy();
  const invalidateRelatedPoints = useInvalidateRelatedPoints();
  return useAuthenticatedMutation({
    mutationFn: negate,
    onSuccess: (_negationId, { negatedPointId, counterpointId }) => {
      // Invalidate both points involved
      invalidateRelatedPoints(negatedPointId);
      invalidateRelatedPoints(counterpointId);

      // Invalidate point-negations to update relationships
      queryClient.invalidateQueries({
        queryKey: [negatedPointId, "point-negations"],
      });

      // Invalidate favor history since negations affect favor
      queryClient.invalidateQueries({
        queryKey: [negatedPointId, "favor-history"],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: [counterpointId, "favor-history"],
        exact: false,
      });

      // Update user's cred balance
      queryClient.invalidateQueries({
        queryKey: userQueryKey(user?.id),
      });

      // Invalidate feed since negations appear there
      queryClient.invalidateQueries({
        queryKey: ["feed"],
      });

      // Invalidate pinned point in case either point is pinned
      queryClient.invalidateQueries({
        queryKey: ["pinnedPoint"],
      });
    },
  });
};
