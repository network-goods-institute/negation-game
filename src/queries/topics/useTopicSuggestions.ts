import { useQuery } from "@tanstack/react-query";
import { fetchTopicSuggestions } from "@/actions/topics/fetchTopicSuggestions";

export const useTopicSuggestions = (space: string) => {
  return useQuery({
    queryKey: ["topicSuggestions", space],
    queryFn: () => fetchTopicSuggestions(space),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};
