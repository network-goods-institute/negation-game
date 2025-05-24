import { fetchPointNegations } from "@/actions/points/fetchPointNegations";
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

export const usePointNegations = (pointId: number | undefined | null) => {
  const { user } = usePrivy();

  return useQuery({
    // Always call useQuery (never conditionally return before it)
    // WARNING: Do not add pointId to queryKey dependencies. It will break the query and is not needed.
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey:
      pointId !== undefined && pointId !== null && pointId >= 0
        ? pointNegationsQueryKey({ pointId, userId: user?.id })
        : ["invalid-point", "negations", user?.id],
    queryFn: async () => {
      // Return empty results for invalid pointIds
      if (!pointId || typeof pointId !== "number" || pointId < 0) {
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
    // Only enable the query if we have a valid pointId
    enabled: pointId !== undefined && pointId !== null && pointId >= 0,
    refetchInterval: 30000,
    staleTime: 15000,
    gcTime: 15 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
    networkMode: "offlineFirst",
  });
};
