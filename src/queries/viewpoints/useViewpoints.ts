import { fetchViewpoints } from "@/actions/viewpoints/fetchViewpoints";
import { useQuery } from "@tanstack/react-query";

export const useViewpoints = (space: string) => {
  return useQuery({
    queryKey: ["viewpoints", space],
    queryFn: () => fetchViewpoints(space),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
