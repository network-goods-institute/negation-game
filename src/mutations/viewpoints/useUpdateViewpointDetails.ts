import { updateViewpointDetails } from "@/actions/viewpoints/updateViewpointDetails";
import { useAuthenticatedMutation } from "@/mutations/auth/useAuthenticatedMutation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";import { logger } from "@/lib/logger";

export const useUpdateViewpointDetails = () => {
  const queryClient = useQueryClient();

  return useAuthenticatedMutation({
    mutationFn: updateViewpointDetails,
    onSuccess: (data, variables) => {
      // Invalidate the specific viewpoint
      queryClient.invalidateQueries({
        queryKey: ["viewpoint", variables.id],
      });

      // Invalidate viewpoints list queries (they include title/description)
      queryClient.invalidateQueries({
        queryKey: ["viewpoints"],
        exact: false,
      });

      // If topicId was updated, invalidate topics queries
      if (variables.topicId !== undefined) {
        queryClient.invalidateQueries({
          queryKey: ["topics"],
          exact: false,
        });
      }

      toast.success("Rationale details updated successfully");
    },
    onError: (error) => {
      logger.error("Error updating viewpoint details:", error);
      toast.error("Failed to update rationale details. Please try again.");
    },
  });
};
