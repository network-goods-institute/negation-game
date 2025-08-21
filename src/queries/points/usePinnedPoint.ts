import { fetchPinnedPoint } from "@/actions/feed/fetchPinnedPoint";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";

export const usePinnedPoint = (spaceId?: string) => {
  const pathname = usePathname();
  const isInSpecificSpace =
    pathname?.includes("/s/") && !pathname.match(/^\/s\/global\//);
  const ENABLE_PINNED_PRIORITY =
    process.env.NEXT_PUBLIC_FEATURE_PINNED_AND_PRIORITY === "true";

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
    staleTime: ENABLE_PINNED_PRIORITY ? 15 * 1000 : Infinity,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: ENABLE_PINNED_PRIORITY,
    refetchOnMount: ENABLE_PINNED_PRIORITY,
    retry: ENABLE_PINNED_PRIORITY ? 2 : 0,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchInterval: ENABLE_PINNED_PRIORITY ? 30 * 1000 : false,
    enabled:
      ENABLE_PINNED_PRIORITY &&
      !!spaceId &&
      isInSpecificSpace &&
      spaceId !== "global",
  });
};
