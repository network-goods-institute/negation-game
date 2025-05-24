import { publishViewpoint as publishViewpointAction } from "@/actions/viewpoints/publishViewpointAction";
import { useAuthenticatedMutation } from "../auth/useAuthenticatedMutation";
import type { PublishViewpointArgs } from "@/actions/viewpoints/publishViewpointAction";

export const usePublishViewpoint = () => {
  return useAuthenticatedMutation({
    mutationFn: (args: PublishViewpointArgs) => publishViewpointAction(args),
  });
};
