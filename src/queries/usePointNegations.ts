import { fetchPointNegations } from "@/actions/fetchPointNegations";
import { useSetPointData } from "@/queries/usePointData";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";

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
  isPinned: boolean;
  isCommand: boolean;
  pinnedByCommandId: number | null;
};

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
    queryKey: ["point-negations", pointId, privyUser?.id],
    queryFn: async () => {
      const negations = await fetchPointNegations(pointId);

      return negations.map((negation) => {
        const transformedNegation = {
          ...negation,
          restakesByPoint: negation.restakesByPoint,
          slashedAmount: negation.slashedAmount,
          doubtedAmount: negation.doubtedAmount,
          totalRestakeAmount: negation.totalRestakeAmount,
          isPinned: false,
          isCommand: false,
          pinnedByCommandId: negation.pinnedByCommandId,
          restake: negation.restake
            ? {
                id: negation.restake.id ?? 0,
                amount: negation.restake.amount ?? 0,
                originalAmount: negation.restake.originalAmount ?? 0,
                slashedAmount: negation.restake.slashedAmount ?? 0,
                doubtedAmount: negation.restake.doubtedAmount ?? 0,
                totalRestakeAmount: negation.restake.totalRestakeAmount ?? 0,
                effectiveAmount: negation.restake.amount ?? 0,
                isOwner: negation.restake.isOwner,
              }
            : null,
          doubt: negation.doubt
            ? {
                id: negation.doubt.id ?? 0,
                amount: negation.doubt.amount ?? 0,
                userAmount: negation.doubt.userAmount ?? 0,
                isUserDoubt: negation.doubt.isUserDoubt ?? false,
              }
            : null,
        };

        setPointData(
          { pointId: negation.pointId, userId: privyUser?.id },
          transformedNegation
        );
        return transformedNegation;
      });
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};
