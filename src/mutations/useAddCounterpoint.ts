import { addCounterpoint } from "@/actions/addCounterpoint";
import { useAuthenticatedMutation } from "@/mutations/useAuthenticatedMutation";
import { useInvalidateRelatedPoints } from "@/queries/usePointData";
import { userQueryKey } from "@/queries/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { visitedPointsAtom } from "@/atoms/visitedPointsAtom";
import { useVisitedPoints } from "@/hooks/useVisitedPoints";
import { toast } from "sonner";

export const useAddCounterpoint = () => {
  const queryClient = useQueryClient();
  const { user } = usePrivy();
  const invalidateRelatedPoints = useInvalidateRelatedPoints();
  const { markPointAsRead } = useVisitedPoints();
  const [visitedPoints, setVisitedPoints] = useAtom(visitedPointsAtom);

  return useAuthenticatedMutation({
    mutationFn: addCounterpoint,
    onSuccess: (counterpointId, { negatedPointId }) => {
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

      queryClient.invalidateQueries({
        queryKey: userQueryKey(user?.id),
      });
    },
    onError: (error, variables) => {
      console.error(
        `[useAddCounterpoint] Error creating counterpoint for negated point ${variables.negatedPointId}:`,
        error
      );
      toast.error(
        "Failed to create counterpoint: " + (error.message || "Unknown error")
      );
    },
  });
};
