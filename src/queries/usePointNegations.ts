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
        setPointData(
          { pointId: negation.pointId, userId: privyUser?.id },
          negation
        );
      }

      return negations;
    },
  });
};
