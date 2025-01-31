import { fetchViewpoint } from "@/actions/fetchViewpoint";
import { useQuery } from "@tanstack/react-query";

export const useViewpoint = (id: string) => {
  return useQuery({
    queryKey: ["viewpoint", id],
    queryFn: () => fetchViewpoint(id),
  });
};
