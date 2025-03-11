import { useQuery } from "@tanstack/react-query";
import { fetchViewpoints } from "@/actions/fetchViewpoints";

export const useViewpoints = (space: string) => {
  return useQuery({
    queryKey: ["rationales", space],
    queryFn: () => fetchViewpoints(space),
  });
};
