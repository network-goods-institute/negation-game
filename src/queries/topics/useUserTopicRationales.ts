import { useQuery } from "@tanstack/react-query";
import { fetchUserPublishedTopicIdsInSpace } from "@/actions/topics/fetchUserPublishedTopicIdsInSpace";

export const useUserTopicRationales = (
  userId: string | undefined,
  topicIds: number[] | undefined,
  space?: string
) => {
  return useQuery({
    queryKey: ["userTopicRationales", userId, space],
    queryFn: () => fetchUserPublishedTopicIdsInSpace(userId!, space!),
    enabled: !!userId && !!space,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};
