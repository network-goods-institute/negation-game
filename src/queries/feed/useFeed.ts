import { fetchFeedPage } from "@/actions/feed/fetchFeed";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { useFeedWorker } from "@/hooks/data/useFeedWorker";
import { setPrivyToken } from "@/lib/privy/setPrivyToken";import { logger } from "@/lib/logger";
let hasLoggedServerActionError = false;

const isServerActionError = (error: any): boolean => {
  return (
    error?.message?.includes("Failed to find Server Action") &&
    error?.message?.includes(
      "Cannot read properties of undefined (reading 'workers')"
    )
  );
};

const isAuthError = (error: any): boolean => {
  if (!error) return false;
  const errorMessage = error instanceof Error ? error.message : String(error);
  return [
    "Must be authenticated",
    "Authentication required",
    "not authenticated",
    "error when verifying user privy token",
    "invalid auth token",
    "No Privy token found",
    "Privy token expired",
    "JWTExpired",
    "ERR_JWT_EXPIRED",
  ].some((msg) => errorMessage.toLowerCase().includes(msg.toLowerCase()));
};

export const useFeed = (options: { enabled?: boolean } = {}) => {
  const { enabled = true } = options;
  const { user: privyUser, ready, getAccessToken } = usePrivy();
  const { processPoints } = useFeedWorker();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["feed", privyUser?.id, ready],
    queryFn: async () => {
      try {
        const page = await fetchFeedPage();

        if (Array.isArray(page) && page.length > 0 && privyUser?.id) {
          try {
            processPoints(page, privyUser.id);
          } catch (workerError) {
            logger.error("Error processing points with worker:", workerError);
          }
        }

        return page || [];
      } catch (error: any) {
        if (isAuthError(error)) {
          logger.warn(
            "Auth error detected in feed, attempting token refresh:",
            error
          );

          try {
            const refreshed = await setPrivyToken();
            if (refreshed) {
              logger.log("Token refreshed successfully, retrying feed fetch");
              const retryPage = await fetchFeedPage();

              if (
                Array.isArray(retryPage) &&
                retryPage.length > 0 &&
                privyUser?.id
              ) {
                try {
                  processPoints(retryPage, privyUser.id);
                } catch (workerError) {
                  logger.error(
                    "Error processing points with worker after retry:",
                    workerError
                  );
                }
              }

              return retryPage || [];
            }
          } catch (refreshError) {
            logger.error("Failed to refresh token:", refreshError);
          }
        }

        if (isServerActionError(error)) {
          if (!hasLoggedServerActionError) {
            logger.error(
              "Server action error (first occurrence only):",
              error
            );
            hasLoggedServerActionError = true;
          }

          const cachedData = queryClient.getQueryData([
            "feed",
            privyUser?.id,
            ready,
          ]);
          if (cachedData) {
            return cachedData;
          }
        } else {
          logger.error("Error fetching feed:", error);
        }

        const cachedData = queryClient.getQueryData([
          "feed",
          privyUser?.id,
          ready,
        ]);
        if (cachedData) {
          return cachedData;
        }

        return [];
      }
    },
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    retry: (failureCount, error: any) => {
      if (isServerActionError(error) && failureCount >= 1) {
        return false;
      }
      if (isAuthError(error) && failureCount >= 2) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
    enabled: ready && enabled,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    networkMode: "offlineFirst",
    refetchInterval: 120_000,
  });
};
