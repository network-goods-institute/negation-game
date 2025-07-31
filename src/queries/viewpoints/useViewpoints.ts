import { fetchViewpoints } from "@/actions/viewpoints/fetchViewpoints";
import { useQuery } from "@tanstack/react-query";

export const useViewpoints = (space: string) => {
  return useQuery({
    queryKey: ["viewpoints", space],
    queryFn: () => fetchViewpoints(space),
    staleTime: 30_000, // 30 seconds
    gcTime: 10 * 60_000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Use cache if available
    refetchInterval: 60_000, // Auto-refresh every minute
  });
};
