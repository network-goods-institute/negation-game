import { useQuery } from "@tanstack/react-query";
import { fetchAllTopics } from "@/actions/topics/fetchTopics";

export const useAllTopics = (space: string) => {
  return useQuery({
    queryKey: ["allTopics", space],
    queryFn: () => fetchAllTopics(space),
    staleTime: 5 * 60 * 1000,
  });
};
