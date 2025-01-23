import { restake } from "@/actions/restake";
import { useAuthenticatedMutation } from "@/mutations/useAuthenticatedMutation";
import { useInvalidateRelatedPoints } from "@/queries/usePointData";
import { userQueryKey } from "@/queries/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";

export const useRestake = () => {
  const queryClient = useQueryClient();
  const { user } = usePrivy();
  const invalidateRelatedPoints = useInvalidateRelatedPoints();

  return useAuthenticatedMutation({
    mutationFn: restake,
    onSuccess: (_restakeId, { pointId, negationId }) => {
      // Invalidate both points involved
      invalidateRelatedPoints(pointId);
      invalidateRelatedPoints(negationId);

      // Invalidate restake-specific queries
      queryClient.invalidateQueries({
        queryKey: ["restake", pointId, negationId],
      });

      // Invalidate point-negations to update percentages
      queryClient.invalidateQueries({
        queryKey: [pointId, "point-negations"],
      });

      // Invalidate favor history
      queryClient.invalidateQueries({
        queryKey: [pointId, "favor-history"],
      });
      queryClient.invalidateQueries({
        queryKey: [negationId, "favor-history"],
      });

      // Update user's cred balance
      queryClient.invalidateQueries({
        queryKey: userQueryKey(user?.id),
      });

      // Invalidate feed
      queryClient.invalidateQueries({
        queryKey: ["feed"],
      });
    },
  });
};
