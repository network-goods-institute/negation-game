import { useQuery } from "@tanstack/react-query";
import {
  fetchTopicPoints,
  type TopicPointData,
} from "@/actions/topics/fetchTopicPoints";

export { type TopicPointData };

export const useTopicPoints = (topicId: number) => {
  return useQuery({
    queryKey: ["topic-points", topicId],
    queryFn: () => fetchTopicPoints(topicId),
    staleTime: 5 * 60 * 1000,
  });
};
