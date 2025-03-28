import { fetchPointNegations } from "@/actions/fetchPointNegations";
import { usePrivy } from "@privy-io/react-auth";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

export type NegationResult = {
  pointId: number;
  content: string;
  createdAt: Date;
  createdBy: string;
  cred: number;
  amountSupporters: number;
  amountNegations: number;
  negationsCred: number;
  space: string | null;
  viewerCred: number;
  negationIds: number[];
  restake: {
    id: number;
    amount: number;
    originalAmount: number;
    slashedAmount: number;
    doubtedAmount: number;
    totalRestakeAmount: number;
    effectiveAmount: number;
    isOwner: boolean;
  } | null;
  slash: {
    id: number;
    amount: number;
  } | null;
  doubt: {
    id: number;
    amount: number;
    userAmount: number;
    isUserDoubt: boolean;
  } | null;
  favor: number;
  restakesByPoint: number;
  slashedAmount: number;
  doubtedAmount: number;
  totalRestakeAmount: number;
  isPinned: boolean;
  isCommand: boolean;
  pinnedByCommandId: number | null;
};

type NegationQueryKey = readonly [number, "negations", string | undefined];

export const pointNegationsQueryKey = ({
  pointId,
  userId,
}: {
  pointId: number;
  userId?: string;
}): NegationQueryKey => [pointId, "negations", userId];

export const usePointNegations = (pointId: number | undefined) => {
  const { user } = usePrivy();

  // warning, this says it's missing a queryKey: pointId, do not fix it. Every time I have it tried it breaks things.
  return useQuery({
    queryKey: pointId
      ? pointNegationsQueryKey({ pointId, userId: user?.id })
      : [],
    queryFn: async () => {
      if (!pointId) {
        return [];
      }

      try {
        const result = await fetchPointNegations(pointId);

        const processedResult = Array.isArray(result)
          ? result.map((n) => ({
              ...n,
              pointId: n.pointId || 0,
            }))
          : [];

        return processedResult;
      } catch (error) {
        return [];
      }
    },
    placeholderData: keepPreviousData,
    enabled: pointId !== undefined,
    refetchInterval: 30000,
    staleTime: 15000,
    gcTime: 15 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
    networkMode: "offlineFirst",
  });
};
