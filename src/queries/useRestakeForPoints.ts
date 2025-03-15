import { useQuery } from "@tanstack/react-query";
import { fetchRestakeForPoints } from "@/actions/fetchRestakeForPoints";
import { usePrivy } from "@privy-io/react-auth";

export type RestakeResponse = {
  id?: number;
  userId?: string;
  amount?: number;
  effectiveAmount?: number;
  originalAmount?: number;
  slashedAmount?: number;
  doubtedAmount?: number;
  createdAt?: Date;
  availableForDoubts?: boolean;
  totalRestakeAmount: number;
  oldestRestakeTimestamp: Date | null;
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
      userId: privyUser?.id,
    }),
    queryFn: () => fetchRestakeForPoints(pointId, negationId),
    enabled: !!pointId && !!negationId,
  });
};
