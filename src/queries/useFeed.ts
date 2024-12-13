import { fetchFeedPage } from "@/actions/fetchFeed";
import { useSetPointData } from "@/queries/usePointData";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";

export const useFeed = () => {
  const { user: privyUser } = usePrivy();

  const setPointData = useSetPointData();

  return useQuery({
    queryKey: ["feed", privyUser?.id],
    queryFn: async () => {
      const page = await fetchFeedPage();

      for (const point of page) {
        setPointData({ pointId: point.pointId, userId: privyUser?.id }, point);
      }

      return page;
    },
  });
};
