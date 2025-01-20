import { useQuery } from "@tanstack/react-query";
import { fetchDoubtForRestake } from "@/actions/fetchDoubtForRestake";
import { usePrivy } from "@privy-io/react-auth";

export type DoubtResponse = {
  amount: number;
  userDoubts: Array<{
    id: number;
    amount: number;
    createdAt: Date;
  }>;
  userAmount: number;
  isUserDoubt: boolean;
} | null;

export const doubtForRestakeQueryKey = ({
  pointId,
  negationId,
  userId,
}: {
  pointId: number;
  negationId: number;
  userId?: string;
}) => ["doubt-for-restake", pointId, negationId, userId];

export const useDoubtForRestake = (pointId: number, negationId: number) => {
  const { user: privyUser } = usePrivy();

  return useQuery<DoubtResponse>({
    queryKey: doubtForRestakeQueryKey({ 
      pointId, 
      negationId, 
      userId: privyUser?.id 
    }),
    queryFn: () => fetchDoubtForRestake(pointId, negationId),
    enabled: !!pointId && !!negationId
  });
}; 