import { useAuthenticatedQuery } from "@/queries/auth/useAuthenticatedQuery";
import {
  getConversation,
  GetConversationArgs,
} from "@/actions/messages/getConversation";
import { useUser } from "@/queries/users/useUser";

export const useConversation = (
  otherUserId: string,
  options?: { limit?: number; offset?: number }
) => {
  const { data: user } = useUser();
  const userId = user?.id;

  return useAuthenticatedQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: [
      "conversation",
      userId,
      otherUserId,
      options?.limit,
      options?.offset,
    ],
    queryFn: () => getConversation({ otherUserId, ...options }),
    enabled: !!userId && !!otherUserId,
  });
};
