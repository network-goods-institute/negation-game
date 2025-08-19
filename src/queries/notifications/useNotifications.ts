import { useAuthenticatedQuery } from "@/queries/auth/useAuthenticatedQuery";
import { getNotifications } from "@/actions/notifications/getNotifications";
import { useUser } from "@/queries/users/useUser";
import { useAppVisibility } from "@/hooks//utils/useAppVisibility";
import { useMemo } from "react";

export interface UseNotificationsOptions {
  limit?: number;
  unreadOnly?: boolean;
}

export const useNotifications = (options: UseNotificationsOptions = {}) => {
  const { data: user } = useUser();
  const isVisible = useAppVisibility();

  const stableOptions = useMemo(() => options, [JSON.stringify(options)]);

  return useAuthenticatedQuery({
    queryKey: ["notifications", user?.id, stableOptions],
    queryFn: () => getNotifications(stableOptions),
    enabled: !!user?.id, // This already waits for user context via useUser
    refetchInterval: isVisible ? 30000 : false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes in memory
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
