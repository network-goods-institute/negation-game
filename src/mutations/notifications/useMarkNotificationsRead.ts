import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@/actions/notifications/markNotificationsRead";
import { toast } from "sonner";
import { isFeatureEnabled } from "@/lib/featureFlags";

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (!isFeatureEnabled('notifications')) {
        throw new Error('Notifications are disabled');
      }
      return markNotificationRead(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error: any) => {
      const message = error?.message === 'Notifications are disabled'
        ? "Notifications are currently disabled"
        : "Failed to mark notification as read";
      toast.error(message);
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!isFeatureEnabled('notifications')) {
        throw new Error('Notifications are disabled');
      }
      return markAllNotificationsRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications marked as read");
    },
    onError: (error: any) => {
      const message = error?.message === 'Notifications are disabled'
        ? "Notifications are currently disabled"
        : "Failed to mark notifications as read";
      toast.error(message);
    },
  });
};
