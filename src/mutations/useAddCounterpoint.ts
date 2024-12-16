import { addCounterpoint } from "@/actions/addCounterpoint";
import { useAuthenticatedMutation } from "@/mutations/useAuthenticatedMutation";
import { useInvalidateRelatedPoints } from "@/queries/usePointData";
import { userQueryKey } from "@/queries/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";

export const useAddCounterpoint = () => {
  const queryClient = useQueryClient();
  const { user } = usePrivy();
  const invalidateRelatedPoints = useInvalidateRelatedPoints();
  return useAuthenticatedMutation({
    mutationFn: addCounterpoint,
    onSuccess: (counterpointId, { negatedPointId }) => {
      invalidateRelatedPoints(negatedPointId);
      invalidateRelatedPoints(counterpointId);

      //update cred balance
      queryClient.invalidateQueries({
        queryKey: userQueryKey(user?.id),
      });
    },
  });
};
