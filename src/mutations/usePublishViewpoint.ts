import { publishViewpoint as publishViewpointAction } from "@/actions/publishViewpointAction";
import { useAuthenticatedMutation } from "@/mutations/useAuthenticatedMutation";
import type { PublishViewpointArgs } from "@/actions/publishViewpointAction";

export const usePublishViewpoint = () => {
  return useAuthenticatedMutation({
    mutationFn: (args: PublishViewpointArgs) => publishViewpointAction(args),
  });
};
