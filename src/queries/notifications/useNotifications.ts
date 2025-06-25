import { useAuthenticatedQuery } from "@/queries/auth/useAuthenticatedQuery";
import { getNotifications } from "@/actions/notifications/getNotifications";
import { useUser } from "@/queries/users/useUser";
import { useAppVisibility } from "@/hooks/utils/useAppVisibility";

export interface UseNotificationsOptions {
  limit?: number;
  unreadOnly?: boolean;
}

export const useNotifications = (options: UseNotificationsOptions = {}) => {
  const { data: user } = useUser();
  const isVisible = useAppVisibility();

  return useAuthenticatedQuery({
    queryKey: ["notifications", user?.id, options],
    queryFn: () => getNotifications(options),
    enabled: !!user?.id,
    refetchInterval: isVisible ? 30000 : false,
  });
};

export const useUnreadNotificationCount = () => {
  const { data: user } = useUser();
  const isVisible = useAppVisibility();

  return useAuthenticatedQuery({
    queryKey: ["notifications", "unread-count", user?.id],
    queryFn: () =>
      getNotifications({ unreadOnly: true }).then(
        (data: any[]) => data?.length || 0
      ),
    enabled: !!user?.id,
    refetchInterval: isVisible ? 30000 : false,
  });
};
