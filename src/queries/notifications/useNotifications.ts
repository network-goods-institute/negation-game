import { useQuery } from "@tanstack/react-query";
import { getNotifications } from "@/actions/notifications/getNotifications";
import { useUser } from "@/queries/users/useUser";

export interface UseNotificationsOptions {
  limit?: number;
  unreadOnly?: boolean;
}

export const useNotifications = (options: UseNotificationsOptions = {}) => {
  const { data: user } = useUser();

  return useQuery({
    queryKey: ["notifications", user?.id, options],
    queryFn: () => getNotifications(options),
    enabled: !!user?.id,
    refetchInterval: 30000,
  });
};

export const useUnreadNotificationCount = () => {
  const { data: user } = useUser();

  return useQuery({
    queryKey: ["notifications", "unread-count", user?.id],
    queryFn: () =>
      getNotifications({ unreadOnly: true }).then(
        (data: any[]) => data?.length || 0
      ),
    enabled: !!user?.id,
    refetchInterval: 30000,
  });
};
