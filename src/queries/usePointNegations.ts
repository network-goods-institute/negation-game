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
    id: number | null;
    amount: number | null;
    originalAmount: number | null;
    slashedAmount: number | null;
    doubtedAmount: number | null;
    totalRestakeAmount: number | null;
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
    queryKey: pointNegationsQueryKey({ pointId, userId: privyUser?.id }),
    queryFn: async () => {
      const negations = await fetchPointNegations(pointId);

      const transformedNegations = negations.map(negation => {
        const transformedNegation = {
          ...negation,
          restakesByPoint: negation.restakesByPoint,
          restake: negation.restake ? {
            id: negation.restake.id ?? 0,
            amount: negation.restake.amount ?? 0,
            slashedAmount: negation.restake.slashedAmount ?? 0,
            doubtedAmount: negation.restake.doubtedAmount ?? 0,
            originalAmount: negation.restake.originalAmount ?? 0,
            totalRestakeAmount: negation.restake.totalRestakeAmount ?? 0,
            isOwner: negation.restake.isOwner
          } : null,
          doubt: negation.doubt ? {
            id: negation.doubt.id ?? 0,
            amount: negation.doubt.amount ?? 0,
            userAmount: negation.doubt.userAmount ?? 0,
            isUserDoubt: negation.doubt.isUserDoubt
          } : null
        };
        setPointData(
          { pointId: negation.pointId, userId: privyUser?.id },
          transformedNegation
        );
        return transformedNegation;
      });

      return transformedNegations;
    },
  });
};