import { slash } from "@/actions/slash";
import { useAuthenticatedMutation } from "@/mutations/useAuthenticatedMutation";
import { useInvalidateRelatedPoints } from "@/queries/usePointData";
import { userQueryKey } from "@/queries/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import { pointQueryKey } from "@/queries/usePointData";
import { useVisitedPoints } from "@/hooks/useVisitedPoints";

export const useSlash = () => {
  const queryClient = useQueryClient();
  const { user } = usePrivy();
  const invalidateRelatedPoints = useInvalidateRelatedPoints();
  const { markPointAsRead } = useVisitedPoints();
  return useAuthenticatedMutation({
    mutationFn: slash,
    onSuccess: (_slashId, { pointId, negationId }) => {
      // Invalidate both points involved
      invalidateRelatedPoints(pointId);
      invalidateRelatedPoints(negationId);

      // mark the slashed point as visited
      markPointAsRead(pointId);

      // Invalidate slash-specific queries
      queryClient.invalidateQueries({
        queryKey: ["slash", pointId, negationId],
        exact: false,
      });

      // Invalidate point-negations to update relationships and icons
      queryClient.invalidateQueries({
        queryKey: ["point-negations", pointId],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ["point-negations", negationId],
        exact: false,
      });

      // Invalidate favor history
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

      // Invalidate pinned point in case either point is pinned
      queryClient.invalidateQueries({
        queryKey: ["pinnedPoint"],
        exact: false,
      });

      // Invalidate users-reputation data since slashing affects reputation
      queryClient.invalidateQueries({
        queryKey: ["users-reputation"],
        exact: false,
      });

      // Force refetch of point data
      queryClient.refetchQueries({
        queryKey: pointQueryKey({ pointId, userId: user?.id }),
        exact: true,
      });
      queryClient.refetchQueries({
        queryKey: pointQueryKey({ pointId: negationId, userId: user?.id }),
        exact: true,
      });
    },
  });
};
