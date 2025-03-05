import { fetchPinnedPoint } from "@/actions/fetchPinnedPoint";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";

export const usePinnedPoint = (spaceId?: string) => {
  const pathname = usePathname();
  const isInSpecificSpace =
    pathname?.includes("/s/") && !pathname.match(/^\/s\/global\//);

  // Don't fetch pinned points unless we're in a specific space
  const enabled = !!spaceId && isInSpecificSpace;

  return useQuery({
    queryKey: ["pinnedPoint", spaceId, enabled],
    queryFn: () => (enabled ? fetchPinnedPoint({ spaceId }) : null),
    enabled,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};
