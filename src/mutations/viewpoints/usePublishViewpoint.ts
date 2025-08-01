import { publishViewpoint as publishViewpointAction } from "@/actions/viewpoints/publishViewpointAction";
import { useAuthenticatedMutation } from "../auth/useAuthenticatedMutation";
import type { PublishViewpointArgs } from "@/actions/viewpoints/publishViewpointAction";
import { toast } from "sonner";

export const usePublishViewpoint = () => {
  return useAuthenticatedMutation({
    mutationFn: (args: PublishViewpointArgs) => publishViewpointAction(args),
    onError: (error) => {
      console.error("Error publishing viewpoint:", error);

      if (error.message && error.message.includes("no longer exist")) {
        toast.error(error.message, {
          duration: 8000,
        });
      } else {
        toast.error("Failed to publish rationale. Please try again.");
      }
    },
  });
};
