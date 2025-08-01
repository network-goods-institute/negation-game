import { useAuthenticatedQuery } from "@/queries/auth/useAuthenticatedQuery";
import { getUnreadMessageCount } from "@/actions/messages/getUnreadMessageCount";
import { useUser } from "@/queries/users/useUser";
import { useAppVisibility } from "@/hooks/utils/useAppVisibility";

export const useUnreadMessageCount = (spaceId: string) => {
  const { data: user } = useUser();
  const userId = user?.id;
  const isVisible = useAppVisibility();

  return useAuthenticatedQuery({
    queryKey: ["unreadMessageCount", spaceId, userId],
    queryFn: () => getUnreadMessageCount(spaceId),
    enabled: !!userId,
    refetchInterval: isVisible ? 30000 : false, // Pause when tab hidden
  });
};
