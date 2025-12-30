import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  markMultiplayerNotificationRead,
  markMultiplayerNotificationsRead,
} from "@/actions/experiment/multiplayer/notifications";
import { toast } from "sonner";

export const useMarkMultiplayerNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => markMultiplayerNotificationRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["mp-notifications"],
        refetchType: "none",
      });
    },
    onError: () => {
      toast.error("Failed to mark notification as read");
    },
  });
};

export const useMarkAllMultiplayerNotificationsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, showToast = true }: { ids: string[]; showToast?: boolean }) =>
      markMultiplayerNotificationsRead(ids),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["mp-notifications"],
        refetchType: "none",
      });
      if (variables?.showToast !== false && variables?.ids?.length) {
        toast.success("All notifications marked as read");
      }
    },
    onError: () => {
      toast.error("Failed to mark notifications as read");
    },
  });
};
