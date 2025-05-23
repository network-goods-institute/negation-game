import { collectEarnings } from "@/actions/epistemic/collectEarnings";
import { useAuthenticatedMutation } from "@/mutations/auth/useAuthenticatedMutation";
import { userQueryKey } from "@/queries/users/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import { useInvalidateRelatedPoints } from "@/queries/points/usePointData";

export const useCollectEarnings = () => {
  const queryClient = useQueryClient();
  const { user } = usePrivy();
  const invalidateRelatedPoints = useInvalidateRelatedPoints();

  return useAuthenticatedMutation({
    mutationFn: collectEarnings,
    onSuccess: (result) => {
      // Update user's cred balance
      queryClient.invalidateQueries({
        queryKey: userQueryKey(user?.id),
      });

      // Invalidate earnings preview
      queryClient.invalidateQueries({
        queryKey: ["earnings-preview"],
      });

      // Invalidate each affected point and its relationships
      result.affectedPoints.forEach((pointId) => {
        invalidateRelatedPoints(pointId);
      });
    },
  });
};
