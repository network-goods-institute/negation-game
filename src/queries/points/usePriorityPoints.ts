import { fetchPriorityPoints } from "@/actions/feed/fetchPriorityPoints";
import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";

export const usePriorityPoints = () => {
  const { user } = usePrivy();
  const ENABLE_PINNED_PRIORITY =
    process.env.NEXT_PUBLIC_FEATURE_PINNED_AND_PRIORITY === "true";

  return useQuery({
    queryKey: ["priority-points", user?.id],
    queryFn: async () => {
      try {
        if (!user) return [];
        const points = await fetchPriorityPoints();
        return points.map((point) => ({
          ...point,
          isCommand: point.isCommand || false,
          pinnedByCommandId: point.pinnedByCommandId || null,
          restakesByPoint: point.restakesByPoint || 0,
          slashedAmount: point.slashedAmount || 0,
          doubtedAmount: point.doubtedAmount || 0,
          totalRestakeAmount: point.totalRestakeAmount || 0,
          pinCommands: point.pinCommands || [],
        }));
      } catch (error) {
        console.error("Error fetching priority points:", error);
        return [];
      }
    },
    enabled: ENABLE_PINNED_PRIORITY && !!user,
    staleTime: ENABLE_PINNED_PRIORITY ? 15_000 : Infinity,
    gcTime: ENABLE_PINNED_PRIORITY ? 60_000 : 60_000,
    refetchOnWindowFocus: ENABLE_PINNED_PRIORITY,
    refetchOnMount: ENABLE_PINNED_PRIORITY,
    retry: ENABLE_PINNED_PRIORITY ? 3 : 0,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchInterval: ENABLE_PINNED_PRIORITY ? 30_000 : false,
  });
};
