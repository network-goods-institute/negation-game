import {
  updateUserSettings,
  UpdateUserSettingsArgs,
} from "@/actions/users/updateUserSettings";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthenticatedMutation } from "../auth/useAuthenticatedMutation";

export const useUpdateUserSettings = () => {
  const queryClient = useQueryClient();

  return useAuthenticatedMutation({
    mutationFn: (args: UpdateUserSettingsArgs) => updateUserSettings(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
};
