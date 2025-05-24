import { updateViewpointDetails } from "@/actions/viewpoints/updateViewpointDetails";
import { useAuthenticatedMutation } from "@/mutations/auth/useAuthenticatedMutation";

export const useUpdateViewpointDetails = () => {
  return useAuthenticatedMutation({
    mutationFn: updateViewpointDetails,
  });
};
