import { sellEndorsement } from "@/actions/endorsements/sellEndorsement";
import { useAuthenticatedMutation } from "@/mutations/auth/useAuthenticatedMutation";
import { useInvalidateRelatedPoints } from "@/queries/points/usePointData";
import { userQueryKey } from "@/queries/users/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import { userEndorsementsQueryKey } from "@/queries/users/useUserEndorsements";
import { useSpace } from "@/queries/space/useSpace";
import { toast } from "sonner";

export const useSellEndorsement = () => {
  const queryClient = useQueryClient();
  const { user } = usePrivy();
  const invalidateRelatedPoints = useInvalidateRelatedPoints();
  const space = useSpace();

  return useAuthenticatedMutation({
    mutationFn: sellEndorsement,
    onMutate: async ({ pointId, amountToSell }) => {
      // Optimistic update for user endorsement (remove gold border)
      const endorsementQueryKey = userEndorsementsQueryKey({ pointId, userId: user?.id });
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: endorsementQueryKey });
      
      // Get previous value
      const previousEndorsement = queryClient.getQueryData(endorsementQueryKey);
      
      // Optimistically update endorsement (reduce by amount sold)
      queryClient.setQueryData(endorsementQueryKey, (old: number | null | undefined) => {
        const newAmount = (old || 0) - amountToSell;
        return newAmount <= 0 ? null : newAmount;
      });
      
      return { previousEndorsement, endorsementQueryKey };
    },
    onError: (err, variables, context) => {
      // Revert optimistic update on error
      if (context?.previousEndorsement !== undefined) {
        queryClient.setQueryData(context.endorsementQueryKey, context.previousEndorsement);
      }
      toast.error("Failed to sell endorsement");
    },
    onSuccess: (_, { pointId }) => {
      toast.success("Endorsement sold successfully");

      queryClient.invalidateQueries({
        queryKey: userEndorsementsQueryKey({ pointId, userId: user?.id }),
        exact: true,
        refetchType: "active",
      });

      // Invalidate the endorsed point
      invalidateRelatedPoints(pointId);

      // Invalidate favor history since endorsements affect favor
      queryClient.invalidateQueries({
        queryKey: [pointId, "favor-history"],
        exact: false,
      });

      // Update user's cred balance
      queryClient.invalidateQueries({
        queryKey: userQueryKey(user?.id),
        refetchType: "all",
      });

      // Force invalidate feed queries with refetchType: 'all' to bypass staleTime
      queryClient.invalidateQueries({
        queryKey: ["feed", user?.id],
        refetchType: "all",
      });

      // Also invalidate any feed query without user ID for good measure
      queryClient.invalidateQueries({
        queryKey: ["feed"],
        exact: false,
        refetchType: "all",
      });

      // Invalidate pinned point query with exact space ID match
      queryClient.invalidateQueries({
        queryKey: ["pinned-point", space.data?.id],
        refetchType: "all",
      });

      // Also invalidate any pinned point query
      queryClient.invalidateQueries({
        queryKey: ["pinned-point"],
        exact: false,
        refetchType: "all",
      });

      // Invalidate priority points query matching the query key structure exactly
      queryClient.invalidateQueries({
        queryKey: ["priority-points", user?.id, user],
        refetchType: "all",
      });

      // Also invalidate any priority points query
      queryClient.invalidateQueries({
        queryKey: ["priority-points"],
        exact: false,
        refetchType: "all",
      });

      // Legacy pinnedPoint invalidation
      queryClient.invalidateQueries({
        queryKey: ["pinnedPoint"],
        exact: false,
      });
    },
  });
};
