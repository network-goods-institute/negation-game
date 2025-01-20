import { useQuery } from "@tanstack/react-query";
import { fetchRestakerReputation, RestakerReputation } from "@/actions/fetchRestakerReputation";
import { usePrivy } from "@privy-io/react-auth";

export type RestakerReputationResponse = {
  restakers: Array<RestakerReputation>;
  aggregateReputation: number;
};

export const restakerReputationQueryKey = ({
  pointId,
  negationId,
  userId,
}: {
  pointId: number;
  negationId: number;
  userId?: string;
}) => ["restaker-reputation", pointId, negationId, userId];

export const useRestakerReputation = (pointId: number, negationId: number) => {
  const { user: privyUser } = usePrivy();

  return useQuery<RestakerReputationResponse>({
    queryKey: restakerReputationQueryKey({ 
      pointId, 
      negationId, 
      userId: privyUser?.id 
    }),
    queryFn: () => fetchRestakerReputation(pointId, negationId),
    enabled: !!pointId && !!negationId
  });
}; 