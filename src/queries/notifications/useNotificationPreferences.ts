import { useQuery } from "@tanstack/react-query";
import { getNotificationPreferences } from "@/actions/notifications/getNotificationPreferences";

export const useNotificationPreferences = () => {
  return useQuery({
    queryKey: ["notificationPreferences"],
    queryFn: getNotificationPreferences,
  });
};
