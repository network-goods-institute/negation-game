import { useQuery } from "@tanstack/react-query";
import { getUnreadMessageCount } from "@/actions/messages/getUnreadMessageCount";
import { useUser } from "@/queries/users/useUser";

export const useUnreadMessageCount = () => {
  const { data: user } = useUser();
  const userId = user?.id;

  return useQuery({
    queryKey: ["unreadMessageCount", userId],
    queryFn: () => getUnreadMessageCount(),
    enabled: !!userId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};
