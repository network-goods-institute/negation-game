import { deletePoint } from "@/actions/points/deletePoint";
import { useAuthenticatedMutation } from "@/mutations/auth/useAuthenticatedMutation";
import { useInvalidateRelatedPoints } from "@/queries/points/usePointData";
import { pointQueryKey } from "@/queries/points/usePointData";
import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { useCallback } from "react";

export const useDeletePoint = () => {
  const queryClient = useQueryClient();
  const { user } = usePrivy();
  const invalidateRelatedPoints = useInvalidateRelatedPoints();
  const router = useRouter();
  const pathname = usePathname();

  // Get the current space from pathname if we're in a space
  const getCurrentSpaceUrl = useCallback(() => {
    // If we're in a space (/s/[space]/...), redirect to that space root
    const spaceMatch = pathname?.match(/^\/s\/([^\/]+)/);
    if (spaceMatch && spaceMatch[1]) {
      return `/s/${spaceMatch[1]}`;
    }
    // Otherwise redirect to global root
    return "/";
  }, [pathname]);

  return useAuthenticatedMutation({
    mutationFn: deletePoint,
    onSuccess: (result, { pointId }) => {
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);

      // Invalidate the deleted point
      invalidateRelatedPoints(pointId);

      // Invalidate point data
      queryClient.invalidateQueries({
        queryKey: pointQueryKey({ pointId, userId: user?.id }),
      });

      // Invalidate point negations
      queryClient.invalidateQueries({
        queryKey: [pointId, "negations"],
        exact: false,
      });

      // Update user's cred balance
      queryClient.invalidateQueries({
        queryKey: ["user", user?.id],
        exact: false,
      });

      // Invalidate feed queries
      queryClient.invalidateQueries({
        queryKey: ["feed"],
        exact: false,
        refetchType: "all",
      });

      // Invalidate profile points
      queryClient.invalidateQueries({
        queryKey: ["profile-points"],
        exact: false,
        refetchType: "all",
      });

      // Invalidate priority points
      queryClient.invalidateQueries({
        queryKey: ["priority-points"],
        exact: false,
        refetchType: "all",
      });

      // Get the redirect URL (either space root or global root)
      const redirectUrl = getCurrentSpaceUrl();

      // Navigate to space root after deletion
      router.replace(redirectUrl);
    },
    onError: (error) => {
      console.error("Error deleting point:", error);
      toast.error("Failed to delete point");
    },
  });
};
