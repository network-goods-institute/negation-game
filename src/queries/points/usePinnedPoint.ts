import { fetchPinnedPoint } from "@/actions/feed/fetchPinnedPoint";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";

export const usePinnedPoint = (spaceId?: string) => {
  const pathname = usePathname();
  const isInSpecificSpace =
    pathname?.includes("/s/") && !pathname.match(/^\/s\/global\//);

  return useQuery({
    queryKey: ["pinned-point", spaceId],
    queryFn: async () => {
      try {
        const result = await fetchPinnedPoint({ spaceId: spaceId || "global" });

        // Add default values to prevent undefined errors
        if (result) {
          return {
            ...result,
            isCommand: result.isCommand || false,
            pinnedByCommandId: result.pinnedByCommandId || null,
            restakesByPoint: result.restakesByPoint || 0,
            slashedAmount: result.slashedAmount || 0,
            doubtedAmount: result.doubtedAmount || 0,
            totalRestakeAmount: result.totalRestakeAmount || 0,
            pinCommands: result.pinCommands || [],
          };
        }
        return result;
      } catch (error) {
        return null;
      }
    },
    staleTime: 15 * 1000, // 15 seconds - make more responsive to pin changes
    gcTime: 5 * 60 * 1000, // Keep cached for 5 minutes after unmount
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
    enabled: !!spaceId && isInSpecificSpace && spaceId !== "global",
  });
};
