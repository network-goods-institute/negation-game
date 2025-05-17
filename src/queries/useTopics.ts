import { useQuery } from "@tanstack/react-query";
import { fetchTopics } from "@/actions/fetchTopics";

export const useTopics = (space: string) => {
  return useQuery({
    queryKey: ["topics", space],
    queryFn: () => fetchTopics(space),
    staleTime: 5 * 60 * 1000,
  });
};
