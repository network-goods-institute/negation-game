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

export const useRestake = () => {
  const queryClient = useQueryClient();
  const { user } = usePrivy();
  const invalidateRelatedPoints = useInvalidateRelatedPoints();
  const { markPointAsRead } = useVisitedPoints();
  return useAuthenticatedMutation({
    mutationFn: restake,
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
