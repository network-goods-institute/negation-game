import { negate } from "@/actions/negate";
import { useVisitedPoints } from "@/hooks/useVisitedPoints";
import { useAuthenticatedMutation } from "@/mutations/useAuthenticatedMutation";
import { useInvalidateRelatedPoints } from "@/queries/usePointData";
import { userQueryKey } from "@/queries/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAtom } from "jotai";
import { visitedPointsAtom } from "@/atoms/visitedPointsAtom";
import { userEndorsementsQueryKey } from "@/queries/useUserEndorsements";

export const useNegate = () => {
  const queryClient = useQueryClient();
  const { user } = usePrivy();
  const invalidateRelatedPoints = useInvalidateRelatedPoints();
  const { markPointAsRead } = useVisitedPoints();
  const [visitedPoints, setVisitedPoints] = useAtom(visitedPointsAtom);

  return useAuthenticatedMutation({
    mutationFn: negate,
    onSuccess: (_negationId, { negatedPointId, counterpointId }) => {
      toast.success("Negation created successfully");

      invalidateRelatedPoints(negatedPointId);
      invalidateRelatedPoints(counterpointId);

      markPointAsRead(negatedPointId);

      setVisitedPoints((prev) => {
        const newSet = new Set(prev);
        newSet.add(negatedPointId);
        return newSet;
      });

      markPointAsRead(counterpointId);
      setVisitedPoints((prev) => {
        const newSet = new Set(prev);
        newSet.add(counterpointId);
        return newSet;
      });

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

      // Invalidate user's endorsement data for the new counterpoint to refresh OPBadge
      queryClient.invalidateQueries({
        queryKey: userEndorsementsQueryKey({
          pointId: counterpointId,
          userId: user?.id,
        }),
        exact: false,
      });
    },
    onError: (error) => {
      toast.error(
        "Failed to create negation: " + (error.message || "Unknown error")
      );
    },
  });
};
