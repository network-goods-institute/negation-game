import { makePoint } from "@/actions/points/makePoint";
import { useAuthenticatedMutation } from "@/mutations/auth/useAuthenticatedMutation";
import { userQueryKey } from "@/queries/users/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import { useVisitedPoints } from "@/hooks/points/useVisitedPoints";
import { useAtom } from "jotai";
import { visitedPointsAtom } from "@/atoms/visitedPointsAtom";
import { toast } from "sonner";

export const useMakePoint = () => {
  const queryClient = useQueryClient();
  const { user } = usePrivy();
  const { markPointAsRead } = useVisitedPoints();
  const [visitedPoints, setVisitedPoints] = useAtom(visitedPointsAtom);

  return useAuthenticatedMutation({
    mutationFn: makePoint,
    onSuccess: (pointId) => {
      toast.success("Point created successfully");
      markPointAsRead(pointId);

      setVisitedPoints((prev) => {
        const newSet = new Set(prev);
        newSet.add(pointId);
        return newSet;
      });

      queryClient.invalidateQueries({
        queryKey: ["feed"],
      });
      queryClient.invalidateQueries({
        queryKey: userQueryKey(user?.id),
      });
    },
    onError: (error) => {
      toast.error(
        "Failed to create point: " + (error.message || "Unknown error")
      );
    },
  });
};
