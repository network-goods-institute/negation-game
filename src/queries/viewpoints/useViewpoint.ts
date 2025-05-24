import { fetchViewpoint } from "@/actions/viewpoints/fetchViewpoint";
import { useQuery } from "@tanstack/react-query";

export function useViewpoint(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["viewpoint", id],
    queryFn: () => fetchViewpoint(id),
    enabled: options?.enabled ?? true,
  });
}
