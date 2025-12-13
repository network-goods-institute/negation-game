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
      queryClient.invalidateQueries({ queryKey: ["mp-notifications"] });
    },
    onError: () => {
      toast.error("Failed to mark notification as read");
    },
  });
};

export const useMarkAllMultiplayerNotificationsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => markMultiplayerNotificationsRead(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mp-notifications"] });
      toast.success("All notifications marked as read");
    },
    onError: () => {
      toast.error("Failed to mark notifications as read");
    },
  });
};
