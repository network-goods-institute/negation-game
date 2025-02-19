import { useQuery } from "@tanstack/react-query";
import { fetchViewpoints } from "@/actions/fetchViewpoints";

export const useViewpoints = (space: string) => {
  return useQuery({
    queryKey: ["viewpoints", space],
    queryFn: () => fetchViewpoints(space),
  });
};
