import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateNotificationPreferences,
  UpdateNotificationPreferencesArgs,
} from "@/actions/notifications/updateNotificationPreferences";
import { toast } from "sonner";

export const useUpdateNotificationPreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: UpdateNotificationPreferencesArgs) =>
      updateNotificationPreferences(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificationPreferences"] });
      toast.success("Notification preferences updated");
    },
    onError: (error) => {
      console.error("Failed to update notification preferences:", error);
      toast.error("Failed to update preferences");
    },
  });
};
