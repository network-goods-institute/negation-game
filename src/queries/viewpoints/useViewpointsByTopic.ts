import { useQuery } from "@tanstack/react-query";
import { fetchViewpointsByTopic } from "@/actions/viewpoints/fetchViewpointsByTopic";

export const useViewpointsByTopic = (space: string, topicId: number | undefined) => {
  return useQuery({
    queryKey: ["viewpointsByTopic", space, topicId],
    queryFn: () => fetchViewpointsByTopic(space, topicId!),
    staleTime: 30_000, // 30 seconds
    gcTime: 10 * 60_000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Use cache if available
    refetchInterval: 60_000, // Auto-refresh every minute
    enabled: !!topicId && !!space, // Only run query if both topicId and space are available
  });
};