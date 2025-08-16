import { useAuthenticatedQuery } from "@/queries/auth/useAuthenticatedQuery";
import { getConversation } from "@/actions/messages/getConversation";
import { useUser } from "@/queries/users/useUser";

export const useConversation = (args: {
  otherUserId: string;
  spaceId: string;
  options?: { limit?: number; offset?: number };
}) => {
  const { otherUserId, spaceId, options } = args;
  const { data: user } = useUser();
  const userId = user?.id;

  return useAuthenticatedQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: [
      "conversation",
      userId,
      otherUserId,
      spaceId,
      options?.limit,
      options?.offset,
    ],
    queryFn: () => getConversation({ otherUserId, spaceId, ...options }),
    enabled: !!userId && !!otherUserId,
  });
};
