import { useQuery } from "@tanstack/react-query";
import { fetchUserTopicRationales } from "@/actions/topics/fetchUserTopicRationales";

export const useUserTopicRationales = (userId: string | undefined, topicIds: number[]) => {
  return useQuery({
    queryKey: ["userTopicRationales", userId, topicIds],
    queryFn: () => fetchUserTopicRationales(userId!, topicIds),
    enabled: !!userId && topicIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });
};