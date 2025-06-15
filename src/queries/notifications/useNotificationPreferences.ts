import { useAuthenticatedQuery } from "@/queries/auth/useAuthenticatedQuery";
import { getNotificationPreferences } from "@/actions/notifications/getNotificationPreferences";

export const useNotificationPreferences = () => {
  return useAuthenticatedQuery({
    queryKey: ["notificationPreferences"],
    queryFn: getNotificationPreferences,
  });
};
