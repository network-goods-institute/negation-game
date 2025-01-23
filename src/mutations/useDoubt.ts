import { doubt } from "@/actions/doubt";
import { useAuthenticatedMutation } from "@/mutations/useAuthenticatedMutation";
import { useInvalidateRelatedPoints } from "@/queries/usePointData";
import { userQueryKey } from "@/queries/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";

export const useDoubt = () => {
  const queryClient = useQueryClient();
  const { user } = usePrivy();
  const invalidateRelatedPoints = useInvalidateRelatedPoints();

  return useAuthenticatedMutation({
    mutationFn: doubt,
    onSuccess: (_doubtId, { pointId, negationId }) => {
      // Invalidate both points involved
      invalidateRelatedPoints(pointId);
      invalidateRelatedPoints(negationId);

      // Invalidate doubt-specific queries
      queryClient.invalidateQueries({
        queryKey: ["doubt", pointId, negationId],
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
