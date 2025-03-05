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
      // Invalidate the endorsed point
      invalidateRelatedPoints(pointId);

      // Invalidate favor history since endorsements affect favor
      queryClient.invalidateQueries({
        queryKey: [pointId, "favor-history"],
        exact: false,
      });

      // Update user's cred balance
      queryClient.invalidateQueries({
        queryKey: userQueryKey(user?.id),
      });

      // Invalidate feed since endorsements affect visibility
      queryClient.invalidateQueries({
        queryKey: ["feed"],
      });

      // Invalidate pinned point in case this point is pinned
      queryClient.invalidateQueries({
        queryKey: ["pinnedPoint"],
      });
    },
  });
};
