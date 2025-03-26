import { fetchPointNegations } from "@/actions/fetchPointNegations";
import { usePrivy } from "@privy-io/react-auth";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

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

  // warning, this says it's missing a queryKey: pointId, do not fix it.pnpm
  return useQuery({
    queryKey: pointId
      ? pointNegationsQueryKey({ pointId, userId: user?.id })
      : [],
    queryFn: async () => {
      if (!pointId) {
        return [];
      }

      const startTime = Date.now();

      try {
        const result = await fetchPointNegations(pointId);

        // Process the result to ensure all fields have defaults
        const processedResult = Array.isArray(result)
          ? result.map((n) => ({
              ...n,
              // Add defaults for important fields to prevent undefined errors
              pointId: n.pointId || 0,
            }))
          : [];

        return processedResult;
      } catch (error) {
        return [];
      }
    },
    placeholderData: keepPreviousData,
    enabled: pointId !== undefined, // Only run the query if pointId is defined
    refetchInterval: 15000, // 15 seconds - faster refresh
    staleTime: 1000, // 1 second - almost always refetch when requested
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
    retry: 2, // Limit retries to avoid excessive network requests
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000), // Faster retry
    networkMode: "offlineFirst", // Prioritize cached data
  });
};
