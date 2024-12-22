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

export const RestakeDialog: FC<RestakeDialogProps> = ({
  originalPoint,
  counterPoint,
  open,
  onOpenChange,
  onEndorseClick,
  openedFromSlashedIcon,
  ...props
}) => {
  const { data: existingRestake } = useQuery({
    queryKey: ['restake', originalPoint.id, counterPoint.id],
    queryFn: () => fetchRestakeForPoints(originalPoint.id, counterPoint.id)
  });

  const { data: existingDoubt } = useQuery({
    queryKey: ['doubt', originalPoint.id, counterPoint.id],
    queryFn: () => fetchDoubtForRestake(originalPoint.id, counterPoint.id),
    enabled: !!originalPoint.id && !!counterPoint.id && openedFromSlashedIcon
  });

  const [stakedCred, setStakedCred] = useState(0);

  useEffect(() => {
    if (openedFromSlashedIcon) {
      setStakedCred(existingDoubt?.amount ?? 0);
    } else if (existingRestake) {
      setStakedCred(existingRestake.effectiveAmount);
    } else {
      setStakedCred(0);
    }
  }, [existingDoubt, existingRestake, openedFromSlashedIcon]);

  const { data: userId, isLoading: isLoadingUserId } = useQuery({
    queryKey: ['userId'],
    queryFn: getUserId
  });

  const canDoubt = useMemo(() => {
    if (!openedFromSlashedIcon) return true; // Not in doubt mode
    if (isLoadingUserId) return false; // Still loading user
    if (!existingRestake) return false; // No restake to doubt
    if (!userId) return false; // No user logged in
    return true; // Remove restriction on doubting own restake
  }, [openedFromSlashedIcon, existingRestake, userId, isLoadingUserId]);

  const maxStakeAmount = Math.floor(openedFromSlashedIcon 
    ? canDoubt 
      ? Math.min(
          originalPoint.stakedAmount || 0, 
          Number(existingRestake?.totalRestakeAmount ?? 0)
        )
      : 0
    : (originalPoint.viewerCred || 0)
  );

  // Get favor from restaking from localStorage
  const favorFromRestaking = useMemo(() => {
    return existingRestake?.effectiveAmount || 0;
  }, [existingRestake]);

  const [isSlashing, setIsSlashing] = useState(false);
  const [timelineScale, setTimelineScale] = useState<TimelineScale>(DEFAULT_TIMESCALE);
  const [endorsePopoverOpen, toggleEndorsePopoverOpen] = useToggle(false);
  const { cred, setCred, notEnoughCred } = useCredInput({
    resetWhen: !endorsePopoverOpen,
  });
  const queryClient = useQueryClient();
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

  const { data: favorHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["favor-history", originalPoint.id, timelineScale],
    queryFn: () => fetchFavorHistory({ 
      pointId: originalPoint.id, 
      scale: timelineScale 
    }),
    enabled: open,
  });

  const currentlyStaked = existingRestake?.effectiveAmount || 0;
  const newStakeAmount = stakedCred;

  const slashAmount = isSlashing ? Math.floor(currentlyStaked - newStakeAmount) : 0;
  const stakeAmount = isSlashing ? 0 : Math.floor(newStakeAmount);
  
  // Calculate the delta between new stake and current stake
  const bonusFavor = Math.floor(isSlashing ? 
    slashAmount : // For slashing, use the full slash amount
    (stakeAmount - currentlyStaked) // For staking, use the difference
  );

  // Get the current favor from the last data point
  const currentFavor = favorHistory?.length ? favorHistory[favorHistory.length - 1].favor : 50;
  
  const handleSliderChange = useCallback((values: number[]) => {
    const newStakedCred = Math.floor(values[0]);
    setStakedCred(newStakedCred);
    setIsSlashing(openedFromSlashedIcon ? false : newStakedCred < currentlyStaked);
  }, [currentlyStaked, openedFromSlashedIcon]);

  const projectedData = favorHistory ? [
    ...favorHistory,
    {
      timestamp: new Date(Date.now() + 8000),
      favor: currentFavor + (openedFromSlashedIcon ? -bonusFavor : (isSlashing ? -bonusFavor : bonusFavor)),
      isProjection: true
    }
  ] : [];

  // Reset states when dialog closes
  useEffect(() => {
    if (!open) {
      setStakedCred(currentlyStaked);
      setShowSuccess(false);
      setIsSlashing(false);
    }
  }, [open, currentlyStaked]);

  const [isSubmitting, setIsSubmitting] = useState(false);

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
      console.error("Error in handleSubmit:", error);
      // If error, rollback the optimistic update
      queryClient.invalidateQueries({
        queryKey: ['restake', originalPoint.id, counterPoint.id]
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const doubtApy = useMemo(() => {
    if (!openedFromSlashedIcon) return 0;
    // Calculate APY based on staked amount
    // This is a placeholder calculation - we need to implement actual APY logic
    return Math.floor((stakedCred / maxStakeAmount) * 100);
  }, [openedFromSlashedIcon, stakedCred, maxStakeAmount]);

  const mockRestakers: RestakerInfo[] = [
    { address: "0x1234...5678", amount: 100, reputation: 85 },
    { address: "0x8765...4321", amount: 50, reputation: 92 },
    { address: "0x2468...1357", amount: 75, reputation: 78 },
  ];

  const aggregateReputation = useMemo(() => {
    if (!openedFromSlashedIcon) return 0;
    
    const totalStaked = mockRestakers.reduce((sum, r) => sum + r.amount, 0);
    const weightedRep = mockRestakers.reduce((sum, r) => 
      sum + (r.reputation * r.amount / totalStaked), 0);
    
    return Math.round(weightedRep);
  }, [openedFromSlashedIcon]);

  const effectiveTotalRestaked = existingRestake?.effectiveAmount || 0;
  const effectiveFavorFromRestaking = favorFromRestaking || 0;
  const totalDoubt = stakedCred;

  // Recalculate daily earnings and APY
  const dailyEarnings = useMemo(() => {
    if (!openedFromSlashedIcon || stakedCred === 0) return 0;
    
    // Base rate of 0.3 cred per day per cred doubted
    // Decreases as you doubt more (diminishing returns)
    const baseRate = 0.3;
    const diminishingFactor = 1 - (stakedCred / maxStakeAmount) * 0.5; // 50% reduction at max doubt
    return Math.floor(stakedCred * baseRate * diminishingFactor * 100) / 100;
  }, [stakedCred, maxStakeAmount, openedFromSlashedIcon]);

  // Calculate APY based on daily earnings
  const apy = useMemo(() => {
    if (stakedCred === 0) return 0;
    return Math.floor((dailyEarnings * 365 / stakedCred) * 100);
  }, [dailyEarnings, stakedCred]);

  // Calculate favor impact
  const favorReduced = stakedCred;
  const resultingFavor = Math.max(0, effectiveFavorFromRestaking - favorReduced);

  const paybackPeriod = useMemo(() => {
    if (dailyEarnings === 0 || stakedCred === 0) return 0;
    return Math.ceil(stakedCred / dailyEarnings);
  }, [dailyEarnings, stakedCred]);

  if (maxStakeAmount === 0 && !openedFromSlashedIcon) {
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
                      <div className="text-sm text-muted-foreground">{dailyEarnings} cred/day</div>
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

                {/* Reputation Row - Full width */}
                <div 
                  className="flex items-center justify-between p-3 bg-muted/40 rounded-lg cursor-pointer hover:bg-muted/60"
                  onClick={() => setShowReputationAnalysis(true)}
                >
                  <div>
                    <span className="text-xs font-medium">Restaker Reputation</span>
                    <div className="text-lg mt-1">{aggregateReputation}%</div>
                  </div>
                  <span className="text-muted-foreground">→</span>
                </div>
              </div>
            )}

            {/* Timeline Controls */}
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

            {/* Graph Section */}
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

                          const textY = isSlashing ? cy + 20 : cy - 10;

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
                                  x={cx + (openedFromSlashedIcon ? -35 : (isSlashing ? 30 : -35))}
                                  y={textY}
                                  textAnchor={openedFromSlashedIcon ? "start" : (isSlashing ? "end" : "start")}
                                  fill="currentColor"
                                  className="text-xs whitespace-nowrap animate-none text-endorsed"
                                >
                                  {openedFromSlashedIcon ? 
                                    `-${favorReduced}` :  // Doubting
                                    isSlashing ? 
                                      `-${slashAmount}` :  // Slashing
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
              <div className="flex items-center gap-2 text-sm bg-yellow-500 dark:bg-yellow-500/90 text-black dark:text-white rounded-md p-3">
                <AlertCircle className="size-4 shrink-0" />
                <p>
                  Reducing your stake will slash your restaked cred from the original point. 
                  You&apos;ll give up {currentlyStaked - stakedCred} cred.
                </p>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              {openedFromSlashedIcon ? (
                `You are placing ${stakeAmount} cred in doubt of...`
              ) : isSlashing ? (
                `You are losing ${slashAmount} cred for slashing...`
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
                ) : isSlashing ? (
                  <>{slashAmount} / {currentlyStaked} slashed ({currentlyStaked > 0 ? Math.round((slashAmount / currentlyStaked) * 100) : 0}%)</>
                ) : (
                  <>{stakeAmount} / {maxStakeAmount} staked ({maxStakeAmount > 0 ? Math.round((stakedCred / maxStakeAmount) * 100) : 0}%)</>
                )}
              </span>
            </div>
            
            <Slider
              value={[stakedCred]}
              onValueChange={handleSliderChange}
              max={maxStakeAmount}
              step={1}
              className="w-full"
              destructive={!openedFromSlashedIcon && isSlashing}
              disabled={maxStakeAmount === 0}
              existingCred={openedFromSlashedIcon ? 0 : currentlyStaked}
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
                <>-{bonusFavor} favor</>
              ) : (
                <>+{bonusFavor} favor</>
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
                disabled={maxStakeAmount === 0 || (!isSlashing && stakedCred === 0) || isSubmitting}
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
        restakers={mockRestakers}
        aggregateReputation={aggregateReputation}
      />
    </Dialog>
  );
}; 