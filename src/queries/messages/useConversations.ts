import { useAuthenticatedQuery } from "@/queries/auth/useAuthenticatedQuery";
import { getConversations } from "@/actions/messages/getConversations";
import { useUser } from "@/queries/users/useUser";

export const useConversations = (spaceId: string) => {
  const { data: user } = useUser();
  const userId = user?.id;

  return useAuthenticatedQuery({
    queryKey: ["conversations", userId, spaceId],
    queryFn: () => getConversations(spaceId),
    enabled: !!userId,
    refetchInterval: 5000, // Refetch every 5 seconds for better real-time updates
    refetchIntervalInBackground: true, // Continue refetching even when tab is not active
    staleTime: 0, // Always consider data stale to ensure fresh data
    retry: (failureCount, error) => {
      // Don't retry authentication errors
      if (
        error instanceof Error &&
        error.message.includes("Must be authenticated")
      ) {
        return false;
      }
      // Retry other errors up to 3 times
      return failureCount < 3;
    },
    meta: {
      onError: (error: Error) => {
        console.error("Conversations query error:", error);
      },
      onSuccess: (data: any) => {
        console.log("Conversations updated, count:", data?.length || 0);
      },
    },
  });
};
