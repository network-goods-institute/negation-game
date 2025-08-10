import { useQuery } from "@tanstack/react-query";
import { fetchConsilienceAuthors } from "@/actions/consilience/fetchConsilienceAuthors";

export const useConsilienceAuthors = (topicId?: number) => {
  return useQuery({
    queryKey: ["consilienceAuthors", topicId],
    queryFn: () => fetchConsilienceAuthors(topicId!),
    enabled: typeof topicId === "number" && topicId > 0,
    staleTime: 60_000,
  });
};
