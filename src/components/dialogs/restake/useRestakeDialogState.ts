import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUserId } from "@/actions/users/getUserId";
import { useUser } from "@/queries/users/useUser";
import { useRestake } from "@/mutations/epistemic/useRestake";
import { useSlash } from "@/mutations/epistemic/useSlash";
import { useDoubt } from "@/mutations/epistemic/useDoubt";
import { useRestakeForPoints } from "@/queries/epistemic/useRestakeForPoints";
import { useDoubtForRestake } from "@/queries/epistemic/useDoubtForRestake";
import { useFavorHistory } from "@/queries/epistemic/useFavorHistory";
import { useRestakerReputation } from "@/queries/epistemic/useRestakerReputation";
import { DEFAULT_TIMESCALE } from "@/constants/config";
import { TimelineScale } from "@/lib/negation-game/timelineScale";
import { useCredInput } from "@/hooks/ui/useCredInput";
import { useToggle } from "@uidotdev/usehooks";
import { useRestakeCalculations } from "./useRestakeCalculations";
import { usePointData } from "@/queries/points/usePointData";import { logger } from "@/lib/logger";

interface UseRestakeDialogStateProps {
  originalPoint: {
    id: number;
    viewerCred?: number;
  };
  counterPoint: {
    id: number;
  };
  open: boolean;
  inDoubtMode: boolean; // true = doubting restakes, false = making/modifying restakes
}

export const useRestakeDialogState = ({
  originalPoint,
  counterPoint,
  open,
  inDoubtMode,
}: UseRestakeDialogStateProps) => {
  // Mutations
  const { mutateAsync: restakeMutation } = useRestake();
  const { mutateAsync: slashMutation } = useSlash();
  const { mutateAsync: doubtMutation } = useDoubt();

  // Queries
  const { data: existingRestake, isLoading: isLoadingRestake } =
    useRestakeForPoints(originalPoint.id, counterPoint.id);

  const { data: existingDoubt, isLoading: isLoadingDoubt } = useDoubtForRestake(
    originalPoint.id,
    counterPoint.id
  );

  const { data: user, isLoading: isLoadingUser } = useUser();

  const { data: userId, isLoading: isLoadingUserId } = useQuery({
    queryKey: ["userId"],
    queryFn: getUserId,
  });

  const { data: reputationData } = useRestakerReputation(
    originalPoint.id,
    counterPoint.id
  );

  // Always fetch freshest parent point data to get up-to-date viewerCred (endorsement)
  const { data: freshParentPoint } = usePointData(originalPoint.id);

  // State
  const [selectedAmount, setSelectedAmount] = useState(0); // Amount selected on slider
  const [isReducingRestake, setIsReducingRestake] = useState(false); // Whether slider is below current restake amount
  const [timelineScale, setTimelineScale] =
    useState<TimelineScale>(DEFAULT_TIMESCALE);
  const [endorsePopoverOpen, toggleEndorsePopoverOpen] = useToggle(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submittedValues, setSubmittedValues] = useState<{
    slashAmount: number;
    stakeAmount: number;
    currentlyStaked: number;
    maxStakeAmount: number;
    stakePercentage: number;
    bonusFavor: number;
    isSlashing: boolean;
    collectedEarnings: number;
  } | null>(null);
  const [showReputationAnalysis, setShowReputationAnalysis] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [endorsementReduced, setEndorsementReduced] = useState(false);

  const { credInput, setCredInput, notEnoughCred } = useCredInput({
    resetWhen: !endorsePopoverOpen,
  });

  // Favor history queries
  const { data: negationFavorHistory } = useFavorHistory({
    pointId: counterPoint.id,
    timelineScale: timelineScale,
  });

  const { data: favorHistory, isLoading: isLoadingHistory } = useFavorHistory({
    pointId: originalPoint.id,
    timelineScale: timelineScale,
  });

  // Derived values
  const currentRestakeAmount = useMemo(() => {
    // Calculate user's current active restake amount (after slashes)
    if (!existingRestake?.isUserRestake) return 0;
    const amount = existingRestake.amount ?? 0;
    const slashedAmount = existingRestake.slashedAmount ?? 0;
    if (slashedAmount >= amount) return 0;
    return amount - slashedAmount;
  }, [existingRestake]);

  // Calculations hook
  const calculations = useRestakeCalculations({
    stakedCred: selectedAmount,
    currentlyStaked: currentRestakeAmount,
    openedFromSlashedIcon: inDoubtMode,
    isSlashing: isReducingRestake,
    originalPoint: {
      viewerCred: freshParentPoint?.viewerCred ?? originalPoint.viewerCred,
    },
    existingDoubt,
    existingRestake,
    user: user ? { cred: user.cred } : undefined,
    negationFavorHistory,
  });

  // Can doubt check
  const canDoubt = useMemo(() => {
    if (!inDoubtMode) return true;
    if (isLoadingUserId) return false;
    if (!userId) return false;
    const totalRestakeAmount = existingRestake?.totalRestakeAmount ?? 0;
    const hasAvailableRestakes =
      existingRestake?.oldestRestakeTimestamp !== null;
    return totalRestakeAmount > 0 && hasAvailableRestakes;
  }, [
    inDoubtMode,
    existingRestake?.totalRestakeAmount,
    existingRestake?.oldestRestakeTimestamp,
    userId,
    isLoadingUserId,
  ]);

  // Projected data for chart
  const currentFavor = favorHistory?.length
    ? favorHistory[favorHistory.length - 1].favor
    : 50;

  const projectedData = favorHistory
    ? [
        ...favorHistory,
        {
          timestamp: new Date(Date.now() + 8000),
          favor:
            currentFavor +
            (inDoubtMode
              ? existingDoubt?.isUserDoubt
                ? -(selectedAmount - existingDoubt.userAmount)
                : -selectedAmount
              : isReducingRestake
                ? -calculations.favorImpact
                : calculations.favorImpact),
          isProjection: true,
        },
      ]
    : [];

  // Effects
  useEffect(() => {
    if (!existingRestake?.isUserRestake) {
      setIsReducingRestake(false);
    }
  }, [existingRestake?.isUserRestake]);

  useEffect(() => {
    if (open) {
      const newSelectedAmount = inDoubtMode
        ? (existingDoubt?.userAmount ?? 0)
        : currentRestakeAmount;
      setSelectedAmount(newSelectedAmount);
    }
  }, [open, currentRestakeAmount, inDoubtMode, existingDoubt?.userAmount]);

  useEffect(() => {
    if (!open) {
      setSelectedAmount(currentRestakeAmount);
      setShowSuccess(false);
      setIsReducingRestake(false);
    }
  }, [open, currentRestakeAmount]);

  useEffect(() => {
    if (existingRestake?.amount && originalPoint.viewerCred) {
      if (originalPoint.viewerCred < existingRestake.amount) {
        setEndorsementReduced(true);
      }
    }
  }, [existingRestake?.amount, originalPoint.viewerCred]);

  // Handlers
  const handleSliderChange = useCallback(
    (values: number[]) => {
      if (
        inDoubtMode &&
        existingDoubt?.isUserDoubt &&
        values[0] < (existingDoubt.userAmount ?? 0)
      ) {
        return;
      }

      if (inDoubtMode && values[0] > (user?.cred ?? 0)) {
        return;
      }

      const newSelectedAmount = Math.floor(values[0]);
      setSelectedAmount(newSelectedAmount);
      setIsReducingRestake(
        inDoubtMode ? false : newSelectedAmount < currentRestakeAmount
      );
    },
    [currentRestakeAmount, inDoubtMode, existingDoubt, user?.cred]
  );

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);

    try {
      if (inDoubtMode) {
        const result = await doubtMutation({
          pointId: originalPoint.id,
          negationId: counterPoint.id,
          amount: selectedAmount,
        });

        if (!result) return;

        setSubmittedValues({
          slashAmount: calculations.slashAmount,
          stakeAmount: calculations.stakeAmount,
          currentlyStaked: currentRestakeAmount,
          maxStakeAmount: calculations.maxStakeAmount,
          stakePercentage: Math.round(
            (selectedAmount / calculations.maxStakeAmount) * 100
          ),
          bonusFavor: calculations.bonusFavor,
          isSlashing: isReducingRestake,
          collectedEarnings: result.earnings,
        });
      } else {
        if (isReducingRestake) {
          await slashMutation({
            pointId: originalPoint.id,
            negationId: counterPoint.id,
            amount: calculations.slashAmount,
          });
        } else {
          await restakeMutation({
            pointId: originalPoint.id,
            negationId: counterPoint.id,
            amount: selectedAmount,
          });
        }

        setSubmittedValues({
          slashAmount: calculations.slashAmount,
          stakeAmount: calculations.stakeAmount,
          currentlyStaked: currentRestakeAmount,
          maxStakeAmount: calculations.maxStakeAmount,
          stakePercentage: Math.round(
            (selectedAmount / calculations.maxStakeAmount) * 100
          ),
          bonusFavor: calculations.bonusFavor,
          isSlashing: isReducingRestake,
          collectedEarnings: 0,
        });
      }

      setShowSuccess(true);
    } catch (error) {
      logger.error("Error submitting action:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    inDoubtMode,
    doubtMutation,
    originalPoint.id,
    counterPoint.id,
    selectedAmount,
    calculations,
    currentRestakeAmount,
    isReducingRestake,
    slashMutation,
    restakeMutation,
  ]);

  const isSubmitDisabled =
    calculations.maxStakeAmount === 0 ||
    (!inDoubtMode && !isReducingRestake && selectedAmount === 0) ||
    isSubmitting ||
    (inDoubtMode &&
      existingDoubt?.isUserDoubt &&
      selectedAmount === existingDoubt.userAmount);

  return {
    // Data
    existingRestake,
    existingDoubt,
    user,
    userId,
    reputationData,
    favorHistory,
    negationFavorHistory,
    projectedData,
    currentRestakeAmount,
    calculations,
    canDoubt,

    // State
    stakedCred: selectedAmount,
    isSlashing: isReducingRestake,
    timelineScale,
    endorsePopoverOpen,
    showSuccess,
    submittedValues,
    showReputationAnalysis,
    isSubmitting,
    endorsementReduced,
    credInput,
    notEnoughCred,
    isSubmitDisabled,

    // Loading states
    isLoadingRestake,
    isLoadingDoubt,
    isLoadingUser,
    isLoadingUserId,
    isLoadingHistory,

    // Handlers
    handleSliderChange,
    handleSubmit,
    setTimelineScale,
    toggleEndorsePopoverOpen,
    setCredInput,
    setShowReputationAnalysis,
  };
};
