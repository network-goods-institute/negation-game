import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { DialogProps } from "@radix-ui/react-dialog";
import { FC, useState, useEffect, useCallback, useMemo } from "react";
import { ArrowLeftIcon, AlertCircle, Check, InfoIcon } from "lucide-react";
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetchFavorHistory } from "@/actions/fetchFavorHistory";
import { useQuery } from "@tanstack/react-query";
import { DEFAULT_TIMESCALE } from "@/constants/config";
import { TimelineScale } from "@/lib/timelineScale";
import { Loader } from "./ui/loader";
import { cn } from "@/lib/cn";
import { endorse } from "@/actions/endorse";
import { CredInput } from "@/components/CredInput";
import { useCredInput } from "@/hooks/useCredInput";
import { useQueryClient } from "@tanstack/react-query";
import { useToggle } from "@uidotdev/usehooks";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { timelineScales } from "@/lib/timelineScale";
import { PointStats } from "@/components/PointStats";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { ReputationAnalysisDialog } from "./ReputationAnalysisDialog";
import { restake } from "@/actions/restake";
import { slash } from "@/actions/slash";
import { fetchRestakeForPoints } from "@/actions/fetchRestakeForPoints";
import { doubt } from "@/actions/doubt";
import { fetchDoubtForRestake } from "@/actions/fetchDoubtForRestake";
import { getUserId } from "@/actions/getUserId";
import { useUser } from "@/hooks/useUser";
import { fetchRestakerReputation } from "@/actions/fetchRestakerReputation";

export interface RestakeDialogProps extends DialogProps {
  originalPoint: {
    id: number;
    content: string;
    createdAt: Date;
    stakedAmount: number;
    viewerCred?: number;
    cred: number;
    negationsCred: number;
    amountSupporters: number;
    amountNegations: number;
    favor?: number;
    restake?: {
      id: number;
      amount: number;
      active: boolean;
      originalAmount: number;
      slashedAmount: number;
      doubtedAmount: number;
    } | null;
    slash?: {
      id: number;
      amount: number;
      active: boolean;
    } | null;
  };
  counterPoint: {
    id: number;
    content: string;
    createdAt: Date;
  };
  onEndorseClick?: () => void;
  openedFromSlashedIcon?: boolean;
}

type RestakerInfo = {
  address: string;
  amount: number;
  reputation: number;
};

type RestakeResponse = {
  id?: number;
  userId?: string;
  effectiveAmount?: number;
  amount?: number;
  slashedAmount?: number;
  doubtedAmount?: number;
  isActive?: boolean;
  totalRestakeAmount: number;
  isUserRestake: boolean;
};

export const RestakeDialog: FC<RestakeDialogProps> = ({
  originalPoint,
  counterPoint,
  open,
  onOpenChange,
  onEndorseClick,
  openedFromSlashedIcon,
  ...props
}) => {
  // Core data fetching hooks
  const { data: existingRestake } = useQuery<RestakeResponse | null>({
    queryKey: ['restake', originalPoint.id, counterPoint.id],
    queryFn: () => fetchRestakeForPoints(originalPoint.id, counterPoint.id)
  });

  const { data: existingDoubt } = useQuery({
    queryKey: ['doubt', originalPoint.id, counterPoint.id],
    queryFn: () => fetchDoubtForRestake(originalPoint.id, counterPoint.id),
    enabled: !!originalPoint.id && !!counterPoint.id
  });

  // State management hooks
  const [stakedCred, setStakedCred] = useState(0);
  const [isSlashing, setIsSlashing] = useState(false);
  const [timelineScale, setTimelineScale] = useState<TimelineScale>(DEFAULT_TIMESCALE);
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
  } | null>(null);
  const [showReputationAnalysis, setShowReputationAnalysis] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [endorsementReduced, setEndorsementReduced] = useState(false);

  // Derived values
  const currentlyStaked = existingRestake?.isUserRestake 
    ? (existingRestake.effectiveAmount ?? 0)
    : 0;
  console.log('currentlyStaked:', currentlyStaked, 'existingRestake:', existingRestake);

  const { data: negationFavorHistory } = useQuery({
    queryKey: ["favor-history", counterPoint.id, timelineScale],
    queryFn: () => fetchFavorHistory({ 
      pointId: counterPoint.id, 
      scale: timelineScale 
    }),
    enabled: open,
  });

  const { data: favorHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["favor-history", originalPoint.id, timelineScale],
    queryFn: () => fetchFavorHistory({ 
      pointId: originalPoint.id, 
      scale: timelineScale 
    }),
    enabled: open,
  });

  useEffect(() => {
    if (!existingRestake?.isUserRestake) {
      setIsSlashing(false);
    }
  }, [existingRestake?.isUserRestake]);

  // Set initial stakedCred when dialog opens
  useEffect(() => {
    if (open) {
      setStakedCred(
        openedFromSlashedIcon 
          ? (existingDoubt?.userAmount ?? 0)  // Use existing doubt amount if it exists
          : currentlyStaked
      );
    }
  }, [open, currentlyStaked, openedFromSlashedIcon, existingDoubt?.userAmount]);

  useEffect(() => {
    if (!open) {
      setStakedCred(currentlyStaked);
      setShowSuccess(false);
      setIsSlashing(false);
    }
  }, [open, currentlyStaked]);

    // After fetching the current endorsement amount, compare it with existing restake/doubt
    useEffect(() => {
      if (existingRestake?.amount && originalPoint.viewerCred) {
        // If current endorsement is less than existing restake/doubt
        if (originalPoint.viewerCred < existingRestake.amount) {
          setEndorsementReduced(true);
        }
      }
    }, [existingRestake?.amount, originalPoint.viewerCred]);

  // User data and authentication
  const { data: userId, isLoading: isLoadingUserId } = useQuery({
    queryKey: ['userId'],
    queryFn: getUserId
  });

  const { data: user, isLoading: isLoadingUser } = useUser();
  const queryClient = useQueryClient();
  const { cred, setCred, notEnoughCred } = useCredInput({
    resetWhen: !endorsePopoverOpen,
  });

  // Derived state calculations
  const isUserRestake = useMemo(() => existingRestake?.userId === userId, [existingRestake?.userId, userId]);

  // Get favor from restaking
  const favorFromRestaking = useMemo(() => {
    return existingRestake?.effectiveAmount || 0;
  }, [existingRestake]);

  // Check if user can place a doubt
  const canDoubt = useMemo(() => {
    if (!openedFromSlashedIcon) return true; // Not in doubt mode
    if (isLoadingUserId) return false; // Still loading user
    if (!existingRestake?.totalRestakeAmount) return false; // No active restakes to doubt
    if (!userId) return false; // No user logged in
    return true;
  }, [openedFromSlashedIcon, existingRestake?.totalRestakeAmount, userId, isLoadingUserId]);

  const favorReduced = stakedCred;

  const effectiveTotalRestaked = existingRestake?.effectiveAmount || 0;
  const effectiveFavorFromRestaking = favorFromRestaking || 0;
  const totalDoubt = stakedCred;

  const hourlyRate = useMemo(() => {
    if (!openedFromSlashedIcon || stakedCred === 0) return 0;
    
    // Base APY of 5%
    const baseAPY = 0.05;
    
    // Get current favor of negation point
    const negationFavor = favorHistory?.length 
      ? favorHistory[favorHistory.length - 1].favor 
      : 0;

    // APY modulation: e^(ln(APY) + ln(current favor + 0.0001))
    const modifiedAPY = Math.exp(
      Math.log(baseAPY) + 
      Math.log(negationFavor + 0.0001)
    );

    // hourly_rate = (APY * doubt_amount) / (365 * 24)
    return (modifiedAPY * stakedCred) / (365 * 24);
  }, [openedFromSlashedIcon, stakedCred, favorHistory]);

  // Calculate daily and yearly earnings
  const dailyEarnings = useMemo(() => {
    return Math.round(hourlyRate * 24 * 100) / 100;
  }, [hourlyRate]);

  // Calculate APY
  const apy = useMemo(() => {
    if (stakedCred === 0) return 0;
    
    const negationFavor = negationFavorHistory?.length 
      ? negationFavorHistory[negationFavorHistory.length - 1].favor 
      : 0;

    console.log('APY calculation:', {
      stakedCred,
      negationFavor,
      baseAPY: 0.05,
      logBaseAPY: Math.log(0.05),
      logNegationFavor: Math.log(negationFavor + 0.0001),
      modifiedAPY: Math.exp(Math.log(0.05) + Math.log(negationFavor + 0.0001))
    });

    const modifiedAPY = Math.exp(
      Math.log(0.05) + 
      Math.log(negationFavor + 0.0001)
    );

    return Math.round(modifiedAPY * 100);
  }, [stakedCred, negationFavorHistory]);

  const resultingFavor = Math.max(0, effectiveFavorFromRestaking - favorReduced);

  const paybackPeriod = useMemo(() => {
    if (dailyEarnings === 0 || stakedCred === 0) return 0;
    return Math.ceil(stakedCred / dailyEarnings);
  }, [dailyEarnings, stakedCred]);

  const isUserDoubt = useMemo(() => {
    return existingDoubt?.isUserDoubt ?? false;
  }, [existingDoubt?.isUserDoubt]);

  const { data: reputationData } = useQuery({
    queryKey: ['restaker-reputation', originalPoint.id, counterPoint.id],
    queryFn: () => fetchRestakerReputation(originalPoint.id, counterPoint.id),
    enabled: open
  });

  const handleSliderChange = useCallback((values: number[]) => {
    // If in doubt mode and user has their own doubt, don't allow changes
    if (openedFromSlashedIcon && existingDoubt?.isUserDoubt) {
      return;
    }
    
    const newStakedCred = Math.floor(values[0]);
    setStakedCred(newStakedCred);
    setIsSlashing(openedFromSlashedIcon ? false : newStakedCred < currentlyStaked);
  }, [currentlyStaked, openedFromSlashedIcon, existingDoubt]);

  // Loading state handler
  if (isLoadingUser) {
    return (
      <Dialog {...props} open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex items-center justify-center p-6">
          <Loader className="size-6" />
        </DialogContent>
      </Dialog>
    );
  }

  // Calculate maximum stake amount based on mode and constraints
  const maxStakeAmount = Math.floor(openedFromSlashedIcon 
    ? canDoubt 
      ? Math.min(
          originalPoint.stakedAmount || 0,
          existingRestake?.totalRestakeAmount ?? 0,
          user?.cred ?? 0,
          originalPoint.viewerCred ?? 0
        )
      : 0
    : Math.min(
        (user?.cred ?? 0) + (currentlyStaked), 
        originalPoint.viewerCred ?? 0
      )
  );

  const newStakeAmount = stakedCred;

  const slashAmount = isSlashing ? 
    Math.min(
      Math.floor(currentlyStaked - newStakeAmount),
      originalPoint.viewerCred ?? 0  // Cap slash at current endorsement
    ) : 0;

  const stakeAmount = isSlashing ? 0 : Math.floor(newStakeAmount);
  
  // Calculate the delta between new stake and current stake
  const bonusFavor = Math.floor(isSlashing ? 
    Math.max(0, (existingDoubt?.amount || 0) - slashAmount) : // doubt - slash
    (stakeAmount - currentlyStaked)
  );

  // Get the current favor from the last data point
  const currentFavor = favorHistory?.length ? favorHistory[favorHistory.length - 1].favor : 50;
  
  const favorImpact = openedFromSlashedIcon ? 
    favorReduced : // Doubting
    isSlashing ? 
      Math.max(0, slashAmount - (existingDoubt?.amount || 0)) :
      bonusFavor; // Restaking

  const projectedData = favorHistory ? [
    ...favorHistory,
    {
      timestamp: new Date(Date.now() + 8000),
      favor: currentFavor + (
        openedFromSlashedIcon ? 
          existingDoubt?.isUserDoubt ? 
            -(stakedCred - existingDoubt.userAmount) : // Show only the change from user's current doubt
            -stakedCred :  // No existing user doubt, show full new doubt
          isSlashing ? 
            -favorImpact : 
            favorImpact
      ),
      isProjection: true
    }
  ] : [];

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      if (openedFromSlashedIcon) {
        await doubt({
          pointId: originalPoint.id,
          negationId: counterPoint.id,
          amount: stakedCred
        });
      } else {
        if (isSlashing) {
          await slash({
            pointId: originalPoint.id,
            negationId: counterPoint.id,
            amount: slashAmount
          });
        } else {
          await restake({
            pointId: originalPoint.id,
            negationId: counterPoint.id,
            amount: stakedCred
          });
        }
      }
      
      setSubmittedValues({
        slashAmount,
        stakeAmount,
        currentlyStaked,
        maxStakeAmount,
        stakePercentage: Math.round((stakedCred / maxStakeAmount) * 100),
        bonusFavor,
        isSlashing
      });
      
      queryClient.invalidateQueries({ 
        queryKey: ['restake']
      });
      queryClient.invalidateQueries({ 
        queryKey: ['point']
      });
      queryClient.invalidateQueries({
        queryKey: ['doubt']
      });
      
      setShowSuccess(true);
    } catch (error) {
      queryClient.invalidateQueries({
        queryKey: ['restake', originalPoint.id, counterPoint.id]
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add info message when hitting cred limit
  const showCredLimitMessage = stakedCred === user?.cred && stakedCred < (
    openedFromSlashedIcon 
      ? Math.min(originalPoint.stakedAmount || 0, Number(existingRestake?.totalRestakeAmount ?? 0))
      : originalPoint.viewerCred || 0
  );

  if ((originalPoint.viewerCred || 0) === 0 && !openedFromSlashedIcon) {
    return (
      <Dialog {...props} open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="flex flex-col gap-4 p-4 sm:p-6 max-w-xl"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-2 pb-2 border-b">
            <div className="flex items-center gap-2">
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="text-primary">
                  <ArrowLeftIcon className="size-5" />
                </Button>
              </DialogClose>
              <DialogTitle>Cannot Restake</DialogTitle>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-center text-center gap-4">
              <AlertCircle className="size-12 text-muted-foreground" />
              <div className="space-y-2">
                <h3 className="text-lg font-medium">You need to endorse the original point first</h3>
                <p className="text-sm text-muted-foreground">
                  Before you can restake this point, you need to endorse it with some cred.
                </p>
              </div>
            </div>

            <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground font-medium">Original Point</p>
              <p className="text-base">{originalPoint.content}</p>
              <span className="text-sm text-muted-foreground block">
                {format(originalPoint.createdAt, "h':'mm a '·' MMM d',' yyyy")}
              </span>
            </div>

            <Button 
              onClick={() => {
                onOpenChange?.(false);
                onEndorseClick?.();
              }}
            >
              Endorse Original Point
            </Button>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Negation</p>
              <div className="p-4 rounded-lg border border-dashed">
                <p className="text-base">{counterPoint.content}</p>
                <span className="text-muted-foreground text-sm mt-2 block">
                  {format(counterPoint.createdAt, "h':'mm a '·' MMM d',' yyyy")}
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (isLoadingUserId) {
    return (
      <Dialog {...props} open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="flex flex-col items-center justify-center gap-4 p-4 sm:p-6 max-w-xl min-h-[200px]"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <DialogTitle className="sr-only">Loading</DialogTitle>
          <Loader className="size-8" />
        </DialogContent>
      </Dialog>
    );
  }

  if (showSuccess && submittedValues) {
    return (
      <Dialog {...props} open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="flex flex-col gap-6 p-4 sm:p-6 max-w-xl overflow-hidden"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center text-center">
            {openedFromSlashedIcon ? (
              <>
                <div className="rounded-full bg-endorsed/10 p-3 mb-6">
                  <Check className="size-6 text-endorsed" />
                </div>
                
                <div className="space-y-2 mb-6">
                  <DialogTitle className="text-xl">Doubt Placed</DialogTitle>
                  <p className="text-muted-foreground">
                    You&apos;ve placed {submittedValues.stakeAmount} cred in doubt against this point
                  </p>
                </div>
              </>
            ) : submittedValues.isSlashing ? (
              <>
                <div className="rounded-full bg-destructive/20 dark:bg-destructive/10 p-3 mb-6">
                  <AlertCircle className="size-6 text-destructive dark:text-red-400" />
                </div>
                
                <div className="space-y-2 mb-6">
                  <DialogTitle className="text-xl">Stake Slashed</DialogTitle>
                  <p className="text-muted-foreground">
                    You&apos;ve slashed <span className="text-destructive dark:text-red-400">
                      {submittedValues.slashAmount} cred
                    </span> from your stake
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-full bg-endorsed/10 p-3 mb-6">
                  <Check className="size-6 text-endorsed" />
                </div>
                
                <div className="space-y-2 mb-6">
                  <DialogTitle className="text-xl">Successfully Restaked!</DialogTitle>
                  <p className="text-muted-foreground">
                    You&apos;ve added <span className="text-endorsed">+{submittedValues.bonusFavor} favor</span> to your point
                  </p>
                </div>
              </>
            )}

            <div className="w-full space-y-6">
              <div className="space-y-2 p-4">
                <p className="text-base">{originalPoint.content}</p>
                <span className="text-sm text-muted-foreground">
                  {format(originalPoint.createdAt, "h':'mm a '·' MMM d',' yyyy")}
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {openedFromSlashedIcon 
                    ? `You've doubted ${submittedValues.stakeAmount} cred against the possibility of restakers slashing...`
                    : submittedValues.isSlashing 
                      ? `You are losing ${submittedValues.slashAmount} cred for slashing...`
                      : `You would relinquish ${submittedValues.stakeAmount} cred if you learned...`
                }
                </p>
                <div className="p-4 rounded-lg border border-dashed border-border hover:bg-muted cursor-pointer">
                  <p className="text-base">{counterPoint.content}</p>
                  <span className="text-muted-foreground text-sm mt-2 block">
                    {format(counterPoint.createdAt, "h':'mm a '·' MMM d',' yyyy")}
                  </span>
                </div>
              </div>

              <div className={cn(
                "rounded-lg px-4 py-3",
                openedFromSlashedIcon 
                  ? "bg-endorsed/10"
                  : submittedValues.isSlashing ? "bg-destructive/10" : "bg-muted/30"
              )}>
                <p className="text-sm text-muted-foreground">
                  {openedFromSlashedIcon ? "Amount Doubted" : (submittedValues.isSlashing ? "Amount Slashed" : "Amount Restaked")}
                </p>
                <p className="text-lg">
                  {openedFromSlashedIcon ? (
                    `${submittedValues.stakeAmount} / ${submittedValues.maxStakeAmount} cred (${submittedValues.stakePercentage}%)`
                  ) : submittedValues.isSlashing ? (
                    `${submittedValues.slashAmount} / ${submittedValues.currentlyStaked} cred (${Math.round((submittedValues.slashAmount / submittedValues.currentlyStaked) * 100)}%)`
                  ) : (
                    `${submittedValues.stakeAmount} / ${submittedValues.maxStakeAmount} cred (${submittedValues.stakePercentage}%)`
                  )}
                </p>
              </div>
            </div>

            <Button 
              className="w-full mt-6" 
              onClick={() => onOpenChange?.(false)}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (openedFromSlashedIcon && !existingRestake) {
    return (
      <Dialog {...props} open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex flex-col gap-6 p-4 sm:p-6 max-w-xl">
          <div className="flex items-center gap-2">
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="text-primary">
                <ArrowLeftIcon className="size-5" />
              </Button>
            </DialogClose>
            <DialogTitle>Nothing to Doubt</DialogTitle>
          </div>

          <div className="flex flex-col items-center text-center gap-4">
            <div className="space-y-2">
              <p className="text-muted-foreground">
                There are no active restakes to doubt for this point-negation pair.
              </p>
              <p className="text-sm text-muted-foreground">
                You can only place doubts against existing restakes.
              </p>
            </div>
          </div>

          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            Close
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  if (openedFromSlashedIcon && !canDoubt) {
    return (
      <Dialog {...props} open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="flex flex-col gap-4 p-4 sm:p-6 max-w-xl"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-2 pb-2 border-b">
            <div className="flex items-center gap-2">
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="text-primary">
                  <ArrowLeftIcon className="size-5" />
                </Button>
              </DialogClose>
              <DialogTitle>Cannot Doubt</DialogTitle>
            </div>
          </div>
          <p className="text-muted-foreground">
            There are no active restakes to doubt.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  // Log when component renders
  console.log('RestakeDialog render - stakedCred:', stakedCred, 'currentlyStaked:', currentlyStaked);

  return (
    <Dialog {...props} open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          "flex flex-col gap-4 p-4 sm:p-6 max-w-xl overflow-hidden",
          // Mobile: Responsive height
          "h-[calc(100vh-2rem)] max-h-[900px]",
          // Desktop:
          "sm:min-h-[800px] sm:max-h-[85vh]"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b shrink-0">
          <div className="flex items-center gap-2">
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="text-primary">
                <ArrowLeftIcon className="size-5" />
              </Button>
            </DialogClose>
            <DialogTitle>
              {openedFromSlashedIcon ? "Place doubt" : "Get higher favor"}
            </DialogTitle>
          </div>
          
          <Popover open={endorsePopoverOpen} onOpenChange={toggleEndorsePopoverOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                className={cn(
                  "border px-4",
                  (originalPoint.viewerCred || 0) > 0 && "text-endorsed"
                )}
              >
                {(originalPoint.viewerCred || 0) > 0 ? "Endorsed" : "Endorse"}
                {(originalPoint.viewerCred || 0) > 0 && (
                  <span className="ml-2">{originalPoint.viewerCred} cred</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="flex flex-col items-start w-96">
              <div className="w-full flex justify-between">
                <CredInput
                  cred={cred}
                  setCred={setCred}
                  notEnoughCred={notEnoughCred}
                />
                <Button
                  disabled={cred === 0 || notEnoughCred}
                  onClick={() => {
                    endorse({ pointId: originalPoint.id, cred }).then(() => {
                      queryClient.invalidateQueries({ 
                        queryKey: ["point", originalPoint.id] 
                      });
                      toggleEndorsePopoverOpen(false);
                    });
                  }}
                >
                  Endorse
                </Button>
              </div>
              {notEnoughCred && (
                <span className="ml-md text-destructive text-sm h-fit">
                  not enough cred
                </span>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* Content area */}
        <div className={cn(
          "flex-1 min-h-0", // min-h-0 is important for proper flex scrolling
          "overflow-y-auto"
        )}>
          <div className={cn(
            "space-y-6",
          )}>
            {/* Original Point with Date */}
            <div className="space-y-2 pb-2">
              <div className="p-4">
                <p className="text-lg font-medium">{originalPoint.content}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-muted-foreground text-sm">
                    {format(originalPoint.createdAt, "h':'mm a '·' MMM d',' yyyy")}
                  </span>
                  <span className="inline-flex px-3 py-1 rounded-full bg-endorsed/10 text-endorsed text-sm">
                    {favorHistory?.length ? favorHistory[favorHistory.length - 1].favor : 50} favor
                  </span>
                </div>
              </div>
            </div>

            {openedFromSlashedIcon && (
              <div className="flex flex-col gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Doubt Information</h3>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5">
                        <InfoIcon className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <p className="text-sm text-muted-foreground">
                        Reputation scores and APY calculations shown here are for demonstration purposes only.
                      </p>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* First Row - 3 items */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col p-2 bg-muted/40 rounded-lg">
                    <span className="text-[10px] text-muted-foreground">Total cred restaked</span>
                    <span className="text-sm text-muted-foreground mt-1">{effectiveTotalRestaked}</span>
                  </div>

                  <div className="flex flex-col p-2 bg-muted/40 rounded-lg">
                    <span className="text-[10px] text-muted-foreground">Total favor from restaking</span>
                    <span className="text-sm text-muted-foreground mt-1">{effectiveFavorFromRestaking}</span>
                  </div>

                  <div className="flex flex-col p-2 bg-muted/40 rounded-lg">
                    <span className="text-[10px] text-muted-foreground">Total doubt</span>
                    <span className="text-sm text-muted-foreground mt-1">{totalDoubt}</span>
                  </div>
                </div>

                {/* Second Row - 3 items */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col p-3 bg-muted/40 rounded-lg">
                    <span className="text-xs font-medium">Favor Reduced</span>
                    <div className="mt-2 space-y-0.5">
                      <div className="text-lg text-endorsed">-{favorReduced}</div>
                      <div className="text-sm text-muted-foreground">favor</div>
                      <div className="text-xs text-muted-foreground">{resultingFavor} remaining</div>
                    </div>
                  </div>

                  <div className="flex flex-col p-3 bg-muted/40 rounded-lg">
                    <span className="text-xs font-medium">Time to ROI</span>
                    <div className="mt-2 space-y-0.5">
                      <div className="text-lg">{paybackPeriod}</div>
                      <div className="text-sm text-muted-foreground">days until</div>
                      <div className="text-sm text-muted-foreground">breakeven</div>
                    </div>
                  </div>

                  <div className="flex flex-col p-3 bg-muted/40 rounded-lg">
                    <span className="text-xs font-medium">APY</span>
                    <div className="mt-2 space-y-0.5">
                      <div className="text-lg text-endorsed">{apy}%</div>
                      <div className="text-sm text-muted-foreground">{dailyEarnings.toFixed(2)} cred/day</div>
                    </div>
                  </div>
                </div>

                {stakedCred >= 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <InfoIcon className="size-4 shrink-0" />
                    <p>
                      For every cred that the restaker slashes you&apos;ll lose one cred out of the amount you&apos;ve doubted
                    </p>
                  </div>
                )}

                {/* Reputation Section */}
                <div 
                  className="flex items-center justify-between p-3 bg-muted/40 rounded-lg cursor-pointer hover:bg-muted/60"
                  onClick={() => setShowReputationAnalysis(true)}
                >
                  <div>
                    <span className="text-xs font-medium">Restaker Reputation</span>
                    <div className="text-lg mt-1">{reputationData?.aggregateReputation ?? 50}%</div>
                  </div>
                  <span className="text-muted-foreground">→</span>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="flex justify-between items-center pb-2">
              <ToggleGroup
                type="single"
                value={timelineScale}
                onValueChange={(v) => v && setTimelineScale(v as TimelineScale)}
                className="flex gap-px w-fit"
              >
                {timelineScales.map((scale) => (
                  <ToggleGroupItem
                    value={scale}
                    className="w-10 h-6 text-sm text-muted-foreground"
                    key={scale}
                  >
                    {scale}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <Loader
                className="text-muted-foreground size-4"
                style={{
                  display: isLoadingHistory ? "block" : "none",
                }}
              />
            </div>

            {/* Graph */}
            <div className="w-full h-32 relative bg-background">
              {isLoadingHistory ? (
                <Loader className="absolute left-0 right-0 mx-auto top-[20px]" />
              ) : (
                <>
                  <div className="sticky top-0 flex justify-end w-full">
                    <span className="text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded-sm translate-x-[-12.5px]">
                      Projected
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      data={projectedData} 
                      className="[&>.recharts-surface]:overflow-visible"
                      margin={{ top: 20, right: 45, bottom: 20, left: 45 }}
                    >
                      <XAxis dataKey="timestamp" hide />
                      <YAxis domain={[0, 100]} hide />
                      <ReferenceLine y={50} className="[&>line]:stroke-muted" />
                      <Tooltip
                        wrapperClassName="backdrop-blur-md !bg-background/15 !pb-2 !pt-1 !px-2 rounded-lg shadow-[0_4px_20px_-2px_rgba(0,0,0,0.2)] border border-border/40"
                        labelClassName="-top-3 text-muted-foreground text-xs"
                        formatter={(value: number) => value.toFixed(2)}
                        labelFormatter={(timestamp: Date) => timestamp.toLocaleString()}
                      />
                      <Line
                        animationDuration={0}
                        dataKey="favor"
                        type="stepAfter"
                        className="overflow-visible text-endorsed"
                        dot={({ cx, cy, payload, index }: any) => {
                          const isLastPoint = index === projectedData.length - 1;
                          if (!isLastPoint) return <g key={`dot-${index}`} />;

                          const textY = (openedFromSlashedIcon || isSlashing) ? cy + 20 : cy - 10;
                          const textX = cx + (openedFromSlashedIcon ? -35 : (isSlashing ? 30 : -35));
                          const textAnchor = openedFromSlashedIcon ? "start" : (isSlashing ? "end" : "start");

                          return (
                            <g key={`dot-${index}`}>
                              <circle 
                                cx={cx} 
                                cy={cy} 
                                r={4} 
                                fill="currentColor" 
                                className="animate-none text-endorsed"
                              />
                              {(favorReduced > 0 || stakeAmount > 0 || slashAmount > 0) && (
                                <text
                                  x={textX}
                                  y={textY}
                                  textAnchor={textAnchor}
                                  fill="currentColor"
                                  className="text-xs whitespace-nowrap animate-none text-endorsed"
                                >
                                  {openedFromSlashedIcon ? 
                                    `-${favorReduced}` :  // Doubting
                                    isSlashing ? 
                                      `-${favorImpact}` :  // Changed from slashAmount to favorImpact
                                      `+${stakeAmount}`    // Restaking
                                  } favor
                                </text>
                              )}
                            </g>
                          );
                        }}
                        stroke="currentColor"
                        strokeWidth={2}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>

            {/* Point Stats - after the graph */}
            <div className="border-t pt-2">
              <PointStats
                className="justify-evenly ~@/lg:~text-xs/sm"
                favor={favorHistory?.length ? favorHistory[favorHistory.length - 1].favor : 50}
                amountNegations={originalPoint.amountNegations}
                amountSupporters={originalPoint.amountSupporters}
                cred={originalPoint.cred}
              />
              <Separator className="my-md" />
            </div>

            {/* Warnings */}
            {!openedFromSlashedIcon && isSlashing && (
              <div className="flex items-center gap-2 text-sm bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-md p-3">
                <AlertCircle className="size-4 shrink-0" />
                <p>
                  Reducing your stake will slash your restaked cred from the original point. 
                  You&apos;ll give up {currentlyStaked - stakedCred} cred.
                </p>
              </div>
            )}

            {!openedFromSlashedIcon && isSlashing && (existingDoubt?.amount ?? 0) > 0 && (
              <div className="flex items-center gap-2 text-sm bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-md p-3">
                <InfoIcon className="size-4 shrink-0" />
                <p>
                  Due to existing doubts ({existingDoubt?.amount ?? 0} cred)
                  {isUserDoubt ? ` (including your ${existingDoubt?.userAmount ?? 0} cred doubt)` : ""}, 
                  slashing will only reduce favor by {favorImpact} instead of {slashAmount}
                </p>
              </div>
            )}

            {showCredLimitMessage && (
              <div className="flex items-center gap-2 text-sm bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-md p-3">
                <InfoIcon className="size-4 shrink-0" />
                <p>
                  {openedFromSlashedIcon ? "Doubt" : "Stake"} amount limited by your available cred ({user?.cred} cred)
                </p>
              </div>
            )}

            {endorsementReduced && (
              <div className="flex items-center gap-2 text-sm bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-md p-3">
                <AlertCircle className="size-4 shrink-0" />
                <p>
                  {openedFromSlashedIcon ? 
                    "The maximum doubt amount has been reduced because some endorsement cred was used for doubt payouts." :
                    isSlashing ?
                      "You can still slash your restake, but the maximum amount has been reduced due to endorsement payouts." :
                      "The maximum restake amount has been reduced because some endorsement cred was used for doubt payouts."
                  }
                </p>
              </div>
            )}

            {isSlashing && endorsementReduced && (
              <div className="flex items-center gap-2 text-sm bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-md p-3">
                <AlertCircle className="size-4 shrink-0" />
                <p>
                  Your maximum slash amount has been reduced to {originalPoint.viewerCred} cred due to endorsement payouts.
                </p>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              {openedFromSlashedIcon ? (
                `You are placing ${stakeAmount} cred in doubt of...`
              ) : isSlashing ? (
                `You are losing ${slashAmount} cred for slashing${(existingDoubt?.amount ?? 0) > 0 ? 
                  ` (doubters will also lose ${Math.min(slashAmount, existingDoubt?.amount ?? 0)} cred)` : 
                  ''
                }...`
              ) : (
                `You would relinquish ${stakeAmount} cred if you learned...`
              )}
            </p>
            {/* Credibility Section with Date */}
            <div className="p-4 rounded-lg border border-dashed border-border hover:bg-muted cursor-pointer">
              <p className="text-base">{counterPoint.content}</p>
              <span className="text-muted-foreground text-sm mt-2 block">
                {format(counterPoint.createdAt, "h':'mm a '·' MMM d',' yyyy")}
              </span>
            </div>

            {openedFromSlashedIcon && (
              <div className="space-y-2 mt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estimated Daily Earnings</span>
                  <span>{dailyEarnings.toFixed(2)} cred</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">APY</span>
                  <span>{apy}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payback Period</span>
                  <span>{paybackPeriod} days</span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className={cn(
          "shrink-0", // Prevent shrinking
          "flex flex-col gap-2 border-t bg-background pt-4",
          "relative",
          "px-0",
          // bottom padding for mobile
          "pb-5 sm:pb-0"
        )}>
          {/* Slider Section */}
          <div className={cn(
            "space-y-4",
            maxStakeAmount === 0 && "opacity-50"
          )}>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">
                {openedFromSlashedIcon ? "Doubt Amount" : "Impact"}
              </span>
              <span className="text-sm text-muted-foreground">
                {openedFromSlashedIcon ? (
                  <>{stakeAmount} / {maxStakeAmount} cred ({Math.round((stakedCred / maxStakeAmount) * 100)}%)</>
                ) : isUserRestake && isSlashing ? (
                  <>{slashAmount} / {currentlyStaked} slashed ({currentlyStaked > 0 ? Math.round((slashAmount / currentlyStaked) * 100) : 0}%)</>
                ) : (
                  <>{stakeAmount} / {maxStakeAmount} staked ({maxStakeAmount > 0 ? Math.round((stakedCred / maxStakeAmount) * 100) : 0}%)</>
                )}
              </span>
            </div>
            
            {openedFromSlashedIcon && existingDoubt?.isUserDoubt && existingDoubt.userAmount > 0 && (
              <div className="flex items-center gap-2 text-sm bg-muted/30 rounded-md p-3">
                <InfoIcon className="size-4 shrink-0" />
                <p>
                  You already have an active doubt of {existingDoubt.userAmount} cred. 
                  Doubts cannot be modified after creation.
                </p>
              </div>
            )}

            <Slider
              value={[stakedCred]}
              onValueChange={handleSliderChange}
              max={maxStakeAmount}
              step={1}
              className="w-full"
              destructive={!openedFromSlashedIcon && isSlashing}
              disabled={maxStakeAmount === 0 || (openedFromSlashedIcon && existingDoubt?.isUserDoubt && existingDoubt.userAmount > 0)}
              existingCred={openedFromSlashedIcon ? existingDoubt?.amount ?? 0 : currentlyStaked}
              isDoubtMode={openedFromSlashedIcon}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <span className={cn(
              "inline-flex px-3 py-1 rounded-full text-sm",
              openedFromSlashedIcon 
                ? "bg-endorsed/10 text-endorsed"
                : isSlashing 
                  ? "bg-destructive/10 text-destructive dark:text-red-400"
                  : "bg-endorsed/10 text-endorsed"
            )}>
              {openedFromSlashedIcon ? (
                <>-{favorReduced} favor</>
              ) : isSlashing ? (
                <>-{favorImpact} favor</>
              ) : (
                <>+{favorImpact} favor</>
              )}
            </span>
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => onOpenChange?.(false)}>
                Cancel
              </Button>
              <Button 
                variant="default" 
                className="bg-primary hover:bg-primary/90"
                onClick={handleSubmit}
                disabled={
                  maxStakeAmount === 0 || 
                  (!openedFromSlashedIcon && !isSlashing && stakedCred === 0) || 
                  isSubmitting ||
                  (openedFromSlashedIcon && existingDoubt?.isUserDoubt && existingDoubt.userAmount > 0)
                }
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
      <ReputationAnalysisDialog
        open={showReputationAnalysis}
        onOpenChange={setShowReputationAnalysis}
        restakers={reputationData?.restakers ?? []}
        aggregateReputation={reputationData?.aggregateReputation ?? 0}
      />
    </Dialog>
  );
}; 