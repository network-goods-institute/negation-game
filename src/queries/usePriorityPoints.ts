import { fetchPriorityPoints } from "@/actions/fetchPriorityPoints";
import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";

export const usePriorityPoints = (shouldFetch = true) => {
  const { user } = usePrivy();

  return useQuery({
    queryKey: ["priority-points", user?.id, user],
    queryFn: async () => {
      if (!user) return [];

      // Add a small delay to prevent this from competing with more critical resources
      if (typeof window !== "undefined") {
        await new Promise((resolve) => {
          // Use requestIdleCallback if available, otherwise setTimeout
          if (window.requestIdleCallback) {
            window.requestIdleCallback(() => resolve(null));
          } else {
            setTimeout(resolve, 100);
          }
        });
      }
      return fetchPriorityPoints();
    },
    enabled: shouldFetch,
    staleTime: 10 * 60_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
};
