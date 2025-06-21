import { restake } from "@/actions/epistemic/restake";
import { useAuthenticatedMutation } from "@/mutations/auth/useAuthenticatedMutation";
import { useInvalidateRelatedPoints } from "@/queries/points/usePointData";
import { userQueryKey } from "@/queries/users/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import { pointQueryKey } from "@/queries/points/usePointData";
import { doubtForRestakeQueryKey } from "@/queries/epistemic/useDoubtForRestake";
import { restakeForPointsQueryKey } from "@/queries/epistemic/useRestakeForPoints";
import { useVisitedPoints } from "@/hooks/points/useVisitedPoints";
import { pointNegationsQueryKey } from "@/queries/points/usePointNegations";

export const useRestake = () => {
  const queryClient = useQueryClient();
  const { user } = usePrivy();
  const invalidateRelatedPoints = useInvalidateRelatedPoints();
  const { markPointAsRead } = useVisitedPoints();
  return useAuthenticatedMutation({
    mutationFn: restake,
    // Optimistic update to speed up UI (PointCard icons)
    onMutate: async ({ pointId, negationId, amount }) => {
      await queryClient.cancelQueries({
        predicate: (q) => {
          const key = q.queryKey as unknown[];
          return (
            (key[1] === "negations" &&
              (key[0] === pointId || key[0] === negationId)) ||
            (Array.isArray(key) && key[0] === "restake-for-points")
          );
        },
      });

      // Snapshot previous data for rollback
      const previousPointNegationsPoint = queryClient.getQueryData<any[]>(
        pointNegationsQueryKey({ pointId, userId: user?.id })
      );
      const previousPointNegationsNeg = queryClient.getQueryData<any[]>(
        pointNegationsQueryKey({ pointId: negationId, userId: user?.id })
      );

      const updateRestakeInArray = (arr: any[] | undefined) => {
        if (!arr) return arr;
        return arr.map((n) => {
          if (n.pointId === negationId && n.restake && n.restake.isOwner) {
            const newAmount = (n.restake?.amount || 0) + amount;
            return {
              ...n,
              restake: {
                ...n.restake,
                amount: newAmount,
                originalAmount: newAmount,
                slashedAmount: 0,
                effectiveAmount: newAmount,
              },
              totalRestakeAmount: (n.totalRestakeAmount || 0) + amount,
            };
          }
          return n;
        });
      };

      // Apply optimistic update to both point's negations lists
      queryClient.setQueryData(
        pointNegationsQueryKey({ pointId, userId: user?.id }),
        updateRestakeInArray(previousPointNegationsPoint)
      );
      queryClient.setQueryData(
        pointNegationsQueryKey({ pointId: negationId, userId: user?.id }),
        updateRestakeInArray(previousPointNegationsNeg)
      );

      // Return context for rollback
      return {
        previousPointNegationsPoint,
        previousPointNegationsNeg,
      };
    },
    onError: (_err, _variables, context) => {
      // Rollback optimistic updates
      if (context?.previousPointNegationsPoint) {
        queryClient.setQueryData(
          pointNegationsQueryKey({
            pointId: context.previousPointNegationsPoint?.[0]?.pointId,
            userId: user?.id,
          }),
          context.previousPointNegationsPoint
        );
      }
      if (context?.previousPointNegationsNeg) {
        queryClient.setQueryData(
          pointNegationsQueryKey({
            pointId: context.previousPointNegationsNeg?.[0]?.pointId,
            userId: user?.id,
          }),
          context.previousPointNegationsNeg
        );
      }
    },
    onSuccess: async (_restakeId, { pointId, negationId }) => {
      // Invalidate both points involved
      invalidateRelatedPoints(pointId);
      invalidateRelatedPoints(negationId);

      // mark the restaked point as visited
      markPointAsRead(pointId);

      // Invalidate restake-specific queries
      queryClient.invalidateQueries({
        queryKey: ["restake", pointId, negationId],
        exact: false,
      });

      // Add a small delay to ensure database changes are fully committed
      // This helps prevent race conditions where the UI queries data before it's ready
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Immediately refetch both doubt data and restake data to avoid race conditions
      // This is critical for the UI to show the doubt option immediately after restaking
      await Promise.all([
        // Refresh doubt-for-restake data
        queryClient.refetchQueries({
          queryKey: doubtForRestakeQueryKey({
            pointId,
            negationId,
            userId: user?.id,
          }),
          exact: true,
        }),

        // Refresh restake-for-points data which also checks for available restakes
        queryClient.refetchQueries({
          queryKey: restakeForPointsQueryKey({
            pointId,
            negationId,
            userId: user?.id,
          }),
          exact: true,
        }),

        // Also refresh any queries that might use the effective-restakes-view
        queryClient.invalidateQueries({
          queryKey: ["effective-restakes", pointId, negationId],
          exact: false,
        }),
      ]);

      // Invalidate point-negations to update relationships and icons
      queryClient.invalidateQueries({
        queryKey: pointNegationsQueryKey({ pointId, userId: user?.id }),
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: pointNegationsQueryKey({
          pointId: negationId,
          userId: user?.id,
        }),
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

      // Invalidate users-reputation data since restaking affects reputation calculations
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
