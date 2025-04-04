import { negate } from "@/actions/negate";
import { useVisitedPoints } from "@/hooks/useVisitedPoints";
import { useAuthenticatedMutation } from "@/mutations/useAuthenticatedMutation";
import { useInvalidateRelatedPoints } from "@/queries/usePointData";
import { userQueryKey } from "@/queries/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const useNegate = () => {
  const queryClient = useQueryClient();
  const { user } = usePrivy();
  const invalidateRelatedPoints = useInvalidateRelatedPoints();
  const { markPointAsRead } = useVisitedPoints();
  return useAuthenticatedMutation({
    mutationFn: negate,
    onSuccess: (_negationId, { negatedPointId, counterpointId }) => {
      toast.success("Negation created successfully");

      // Invalidate both points involved
      invalidateRelatedPoints(negatedPointId);
      invalidateRelatedPoints(counterpointId);

      // mark the negated point as visited
      markPointAsRead(negatedPointId);
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
    onError: (error) => {
      toast.error(
        "Failed to create negation: " + (error.message || "Unknown error")
      );
    },
  });
};
