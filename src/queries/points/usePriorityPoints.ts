import { fetchPriorityPoints } from "@/actions/feed/fetchPriorityPoints";
import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";

export const usePriorityPoints = () => {
  const { user } = usePrivy();

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
    enabled: !!user,
    staleTime: 15_000, // 15 seconds - make more responsive
    gcTime: 60_000, // 1 minute
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
    refetchInterval: 30_000, // Refetch every 30 seconds
  });
};
