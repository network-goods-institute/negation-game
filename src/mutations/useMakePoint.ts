import { makePoint } from "@/actions/makePoint";
import { useAuthenticatedMutation } from "@/mutations/useAuthenticatedMutation";
import { userQueryKey } from "@/queries/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import { useVisitedPoints } from "@/hooks/useVisitedPoints";
import { useAtom } from "jotai";
import { visitedPointsAtom } from "@/atoms/visitedPointsAtom";

export const useMakePoint = () => {
  const queryClient = useQueryClient();
  const { user } = usePrivy();
  const { markPointAsRead } = useVisitedPoints();
  const [_, setVisitedPoints] = useAtom(visitedPointsAtom);

  return useAuthenticatedMutation({
    mutationFn: makePoint,
    onSuccess: (pointId) => {
      // Mark the point as visited
      markPointAsRead(pointId);
      setVisitedPoints((prev) => {
        const newSet = new Set(prev);
        newSet.add(pointId);
        return newSet;
      });

      queryClient.invalidateQueries({
        queryKey: ["feed"],
      });
      //update cred balance
      queryClient.invalidateQueries({
        queryKey: userQueryKey(user?.id),
      });
    },
  });
};
