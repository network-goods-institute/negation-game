import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteMultiplayerNotification,
  type DeleteMultiplayerNotificationOptions,
} from "@/actions/experiment/multiplayer/notifications";

export const useDeleteMultiplayerNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (options: DeleteMultiplayerNotificationOptions) =>
      deleteMultiplayerNotification(options),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["mp-notifications"],
        refetchType: "none",
      });
    },
  });
};
