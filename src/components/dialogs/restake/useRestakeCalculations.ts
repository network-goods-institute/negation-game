import { useMemo } from "react";

interface UseRestakeCalculationsProps {
  stakedCred: number; // Amount selected on slider
  currentlyStaked: number; // User's current active restake amount
  openedFromSlashedIcon: boolean; // Whether in doubt mode
  isSlashing: boolean; // Whether reducing restake amount
  originalPoint: {
    viewerCred?: number;
  };
  existingDoubt?: {
    amount?: number;
    userAmount?: number;
    isUserDoubt?: boolean;
  } | null;
  existingRestake?: {
    totalRestakeAmount?: number;
  } | null;
  user?: {
    cred?: number;
  };
  negationFavorHistory?: Array<{ favor: number }>;
}

export const useRestakeCalculations = ({
  stakedCred,
  currentlyStaked,
  openedFromSlashedIcon,
  isSlashing,
  originalPoint,
  existingDoubt,
  existingRestake,
  user,
  negationFavorHistory,
}: UseRestakeCalculationsProps) => {
  // Calculate maximum amount that can be selected
  const maxSelectableAmount = useMemo(() => {
    if (openedFromSlashedIcon) {
      // In doubt mode: limited by available restakes and user's cred
      return Math.min(
        existingRestake?.totalRestakeAmount ?? 0,
        (user?.cred ?? 0) + (existingDoubt?.userAmount ?? 0)
      );
    }
    // In restake mode: limited by user's endorsement
    return originalPoint.viewerCred ?? 0;
  }, [
    openedFromSlashedIcon,
    existingRestake,
    originalPoint.viewerCred,
    user?.cred,
    existingDoubt?.userAmount,
  ]);

  // Calculate actual action amounts
  const newRestakeAmount = stakedCred;
  const slashAmount = isSlashing
    ? Math.min(
        Math.floor(currentlyStaked - newRestakeAmount),
        originalPoint.viewerCred ?? 0
      )
    : 0;
  const stakeAmount = isSlashing ? 0 : Math.floor(newRestakeAmount);

  // Calculate favor impacts
  const bonusFavor = Math.floor(
    isSlashing
      ? Math.max(0, (existingDoubt?.amount || 0) - slashAmount)
      : stakeAmount - currentlyStaked
  );

  const favorReduced = stakedCred;
  const favorImpact = openedFromSlashedIcon
    ? favorReduced
    : isSlashing
      ? Math.max(0, slashAmount - (existingDoubt?.amount || 0))
      : bonusFavor;

  // Calculate APY and earnings for doubts
  const apy = useMemo(() => {
    if (stakedCred === 0) return 0;

    const negationFavor = negationFavorHistory?.length
      ? negationFavorHistory[negationFavorHistory.length - 1].favor
      : 0;

    const modifiedAPY = Math.exp(
      Math.log(0.05) + Math.log(negationFavor + 0.0001)
    );

    return Math.round(modifiedAPY * 100);
  }, [stakedCred, negationFavorHistory]);

  const hourlyRate = useMemo(() => {
    if (!openedFromSlashedIcon || stakedCred === 0) return 0;
    const apyDecimal = apy / 100;
    return (apyDecimal * stakedCred) / (365 * 24);
  }, [openedFromSlashedIcon, stakedCred, apy]);

  const dailyEarnings = useMemo(() => {
    return Math.round(hourlyRate * 24 * 100) / 100;
  }, [hourlyRate]);

  const paybackPeriod = useMemo(() => {
    if (dailyEarnings === 0 || stakedCred === 0) return 0;
    return Math.ceil(stakedCred / dailyEarnings);
  }, [dailyEarnings, stakedCred]);

  // Calculate limiting factor for doubts
  const limitingFactor = useMemo(() => {
    if (!openedFromSlashedIcon) return null;

    const factors = {
      stake: originalPoint.viewerCred || 0,
      restake: existingRestake?.totalRestakeAmount ?? 0,
      cred: user?.cred ?? 0,
    };

    const minValue = Math.min(...Object.values(factors));

    if (minValue === factors.stake) return "total stake on point";
    if (minValue === factors.restake) return "total amount restaked";
    if (minValue === factors.cred) return "your available cred";

    return null;
  }, [
    openedFromSlashedIcon,
    originalPoint.viewerCred,
    existingRestake?.totalRestakeAmount,
    user?.cred,
  ]);

  // Calculate warnings
  const showCredLimitMessage =
    openedFromSlashedIcon &&
    stakedCred === (user?.cred ?? 0) + (existingDoubt?.userAmount ?? 0) &&
    stakedCred <
      Math.min(
        originalPoint.viewerCred || 0,
        Number(existingRestake?.totalRestakeAmount ?? 0)
      );

  return {
    maxStakeAmount: maxSelectableAmount,
    stakeAmount,
    slashAmount,
    bonusFavor,
    favorReduced,
    favorImpact,
    apy,
    hourlyRate,
    dailyEarnings,
    paybackPeriod,
    limitingFactor,
    showCredLimitMessage,
  };
};
