import { fetchPinnedPoint } from "@/actions/fetchPinnedPoint";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";

export const usePinnedPoint = (spaceId?: string) => {
  const pathname = usePathname();
  const isInSpecificSpace =
    pathname?.includes("/s/") && !pathname.match(/^\/s\/global\//);
  return useQuery({
    queryKey: ["pinned-point", spaceId],
    queryFn: () => fetchPinnedPoint({ spaceId: spaceId || "global" }),
    staleTime: 5 * 60 * 1000, // 5 minutes - pin changes are infrequent
    gcTime: 10 * 60 * 1000, // Keep cached for 10 minutes after unmount
    refetchOnWindowFocus: false,
    enabled: !!spaceId,
  });
};
