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
        const transformedPoint = {
          ...point,
          restake: point.restake ? {
            id: 0,
            amount: point.restake.amount,
            slashedAmount: point.restake.slashedAmount,
            active: true,
            originalAmount: point.restake.totalRestakeAmount,
          } : null
        };
        setPointData({ pointId: point.pointId, userId: privyUser?.id }, transformedPoint);
      }

      return page.map(point => ({
        ...point,
        restake: point.restake ? {
          id: 0,
          amount: point.restake.amount,
          slashedAmount: point.restake.slashedAmount,
          active: true,
          originalAmount: point.restake.totalRestakeAmount,
        } : null
      }));
    },
  });
};
