import { fetchPointNegations } from "@/actions/fetchPointNegations";
import { useSetPointData } from "@/queries/usePointData";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";

export const pointNegationsQueryKey = ({
  pointId,
  userId,
}: {
  pointId: number;
  userId?: string;
}) => [pointId, "point-negations", userId];

export const usePointNegations = (pointId: number) => {
  const { user: privyUser } = usePrivy();
  const setPointData = useSetPointData();

  return useQuery({
    queryKey: pointNegationsQueryKey({ pointId, userId: privyUser?.id }),
    queryFn: async () => {
      const negations = await fetchPointNegations(pointId);

      for (const negation of negations) {
        const transformedNegation = {
          ...negation,
          restakesByPoint: negation.restakesByPoint,
          restake: negation.restake ? {
            id: negation.restake.id ?? 0,
            amount: negation.restake.amount,
            slashedAmount: negation.restake.slashedAmount,
            active: negation.restake.active,
            originalAmount: negation.restake.originalAmount ?? 0,
          } : null
        };

        setPointData(
          { pointId: negation.pointId, userId: privyUser?.id },
          transformedNegation
        );
      }

      return negations;
    },
  });
};
