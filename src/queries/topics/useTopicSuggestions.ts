import { useQuery } from "@tanstack/react-query";
import { fetchTopicSuggestions } from "@/actions/topics/fetchTopicSuggestions";

export const useTopicSuggestions = (space: string) => {
  return useQuery({
    queryKey: ["topicSuggestions", space],
    queryFn: () => fetchTopicSuggestions(space),
    staleTime: 5 * 60 * 1000,
  });
};