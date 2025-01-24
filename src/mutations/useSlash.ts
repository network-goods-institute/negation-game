import { slash } from "@/actions/slash";
import { useAuthenticatedMutation } from "@/mutations/useAuthenticatedMutation";
import { useInvalidateRelatedPoints } from "@/queries/usePointData";
import { userQueryKey } from "@/queries/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";

export const useSlash = () => {
  const queryClient = useQueryClient();
  const { user } = usePrivy();
  const invalidateRelatedPoints = useInvalidateRelatedPoints();

  return useAuthenticatedMutation({
    mutationFn: slash,
    onSuccess: (_slashId, { pointId, negationId }) => {
      // Invalidate both points involved
      invalidateRelatedPoints(pointId);
      invalidateRelatedPoints(negationId);

      // Invalidate restake and slash queries
      queryClient.invalidateQueries({
        queryKey: ["restake", pointId, negationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["slash", pointId, negationId],
      });

      // Also invalidate point-negations to update percentages
      queryClient.invalidateQueries({
        queryKey: [pointId, "point-negations"],
      });

      // Invalidate favor history to update percentages
      queryClient.invalidateQueries({
        queryKey: [pointId, "favor-history"],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: [negationId, "favor-history"],
        exact: false,
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
