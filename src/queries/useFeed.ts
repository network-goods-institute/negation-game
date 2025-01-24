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
          restakesByPoint: point.restakesByPoint,
          slashedAmount: point.slashedAmount,
          doubtedAmount: point.doubtedAmount,
          restake: {
            id: 0,
            amount: 0,
            slashedAmount: 0,
            doubtedAmount: 0,
            active: false,
            originalAmount: 0,
          },
          doubt: {
            id: point.doubt?.id ?? 0,
            amount: point.doubt?.amount ?? 0,
            userAmount: point.doubt?.userAmount ?? 0,
            isUserDoubt: point.doubt?.isUserDoubt ?? false,
          },
        };
        setPointData(
          { pointId: point.pointId, userId: privyUser?.id },
          transformedPoint
        );
      }

      return page.map((point) => ({
        ...point,
        restakesByPoint: point.restakesByPoint,
        slashedAmount: point.slashedAmount,
        doubtedAmount: point.doubtedAmount,
        restake: {
          id: 0,
          amount: 0,
          slashedAmount: 0,
          doubtedAmount: 0,
          active: false,
          originalAmount: 0,
        },
        doubt: {
          id: point.doubt?.id ?? 0,
          amount: point.doubt?.amount ?? 0,
          userAmount: point.doubt?.userAmount ?? 0,
          isUserDoubt: point.doubt?.isUserDoubt ?? false,
        },
      }));
    },
  });
};
