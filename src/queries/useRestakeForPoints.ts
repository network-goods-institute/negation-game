import { useQuery } from "@tanstack/react-query";
import { fetchRestakeForPoints } from "@/actions/fetchRestakeForPoints";
import { usePrivy } from "@privy-io/react-auth";

export type RestakeResponse = {
  id?: number;
  userId?: string;
  effectiveAmount?: number;
  amount?: number;
  slashedAmount?: number;
  doubtedAmount?: number;
  isActive?: boolean;
  totalRestakeAmount: number;
  isUserRestake: boolean;
} | null;

export const restakeForPointsQueryKey = ({
  pointId,
  negationId,
  userId,
}: {
  pointId: number;
  negationId: number;
  userId?: string;
}) => ["restake-for-points", pointId, negationId, userId];

export const useRestakeForPoints = (pointId: number, negationId: number) => {
  const { user: privyUser } = usePrivy();

  return useQuery<RestakeResponse>({
    queryKey: restakeForPointsQueryKey({ 
      pointId, 
      negationId, 
      userId: privyUser?.id 
    }),
    queryFn: () => fetchRestakeForPoints(pointId, negationId),
    enabled: !!pointId && !!negationId
  });
}; 