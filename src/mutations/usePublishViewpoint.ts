import { publishViewpoint } from "@/actions/publishViewpointAction";
import { useAuthenticatedMutation } from "@/mutations/useAuthenticatedMutation";

export const usePublishViewpoint = () => {
  return useAuthenticatedMutation({
    mutationFn: publishViewpoint,
  });
};
