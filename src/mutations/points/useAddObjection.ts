import { addObjection, AddObjectionArgs } from "@/actions/points/addObjection";
import { useAuthenticatedMutation } from "@/mutations/auth/useAuthenticatedMutation";
import { useInvalidateRelatedPoints } from "@/queries/points/usePointData";
import { userQueryKey } from "@/queries/users/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import { useVisitedPoints } from "@/hooks/points/useVisitedPoints";
import { useAtom } from "jotai";
import { visitedPointsAtom } from "@/atoms/visitedPointsAtom";
import { toast } from "sonner";

export const useAddObjection = () => {
  const queryClient = useQueryClient();
  const { user } = usePrivy();
  const invalidateRelatedPoints = useInvalidateRelatedPoints();
  const { markPointAsRead } = useVisitedPoints();
  const [visitedPoints, setVisitedPoints] = useAtom(visitedPointsAtom);

  return useAuthenticatedMutation({
    mutationFn: addObjection,
    onSuccess: (objectionPointId, { targetPointId, contextPointId }) => {
      toast.success("Objection created successfully");

      // Mark the newly created objection point as read
      markPointAsRead(objectionPointId);
      setVisitedPoints((prev) => {
        const newSet = new Set(prev);
        newSet.add(objectionPointId);
        return newSet;
      });

      // Invalidate related points
      invalidateRelatedPoints(objectionPointId);
      invalidateRelatedPoints(targetPointId);
      invalidateRelatedPoints(contextPointId);

      // Invalidate point-negations to update relationships
      queryClient.invalidateQueries({
        queryKey: [targetPointId, "point-negations"],
      });
      queryClient.invalidateQueries({
        queryKey: [objectionPointId, "point-negations"],
      });

      // Invalidate favor history since objections affect relationships
      queryClient.invalidateQueries({
        queryKey: [targetPointId, "favor-history"],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: [objectionPointId, "favor-history"],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: [contextPointId, "favor-history"],
        exact: false,
      });

      // Update user's cred balance
      queryClient.invalidateQueries({
        queryKey: userQueryKey(user?.id),
      });

      queryClient.invalidateQueries({
        queryKey: ["feed"],
      });

      queryClient.invalidateQueries({
        queryKey: ["space-points"],
      });
    },
    onError: (error) => {
      toast.error(
        "Failed to create objection: " + (error.message || "Unknown error")
      );
    },
  });
};
