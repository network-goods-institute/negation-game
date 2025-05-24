import { useQuery } from "@tanstack/react-query";
import {
  fetchRestakerReputation,
  RestakerReputation,
} from "@/actions/epistemic/fetchRestakerReputation";
import { usePrivy } from "@privy-io/react-auth";

export type RestakerReputationResponse = {
  restakers: RestakerReputation[];
  aggregateReputation: number;
};

export const restakerReputationQueryKey = (
  pointId: number,
  negationId: number,
  userId?: string
) => ["restaker-reputation", pointId, negationId, userId] as const;

export const useRestakerReputation = (pointId: number, negationId: number) => {
  const { user: privyUser } = usePrivy();

  return useQuery<RestakerReputationResponse>({
    queryKey: restakerReputationQueryKey(pointId, negationId, privyUser?.id),
    queryFn: () => fetchRestakerReputation(pointId, negationId),
    enabled: !!pointId && !!negationId,
  });
};
