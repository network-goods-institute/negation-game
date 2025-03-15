import { updateViewpointDetails } from "@/actions/updateViewpointDetails";
import { useAuthenticatedMutation } from "@/mutations/useAuthenticatedMutation";

export const useUpdateViewpointDetails = () => {
  return useAuthenticatedMutation({
    mutationFn: updateViewpointDetails,
  });
};
