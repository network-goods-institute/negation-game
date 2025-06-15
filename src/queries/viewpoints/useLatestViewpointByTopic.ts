import { useQuery } from "@tanstack/react-query";
import { fetchLatestViewpointByTopic } from "@/actions/viewpoints/fetchLatestViewpointByTopic";

export const useLatestViewpointByTopic = (
  space: string,
  topicId: number,
  enabled = true
) => {
  return useQuery({
    queryKey: ["latest-viewpoint", space, topicId],
    queryFn: () => fetchLatestViewpointByTopic(space, topicId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
};
