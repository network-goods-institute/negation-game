import { FC } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils/cn";
import { PointStats } from "@/components/cards/pointcard/PointStats";
import { Separator } from "@/components/ui/separator";
import { TimelineScale } from "@/lib/negation-game/timelineScale";
import { FavorHistoryDataPoint } from "@/queries/epistemic/useFavorHistory";
import { RestakerReputationResponse } from "@/queries/epistemic/useRestakerReputation";
import { RestakeResponse } from "@/queries/epistemic/useRestakeForPoints";
import { DoubtResponse } from "@/queries/epistemic/useDoubtForRestake";
import { FavorChart } from "./FavorChart";
import { DoubtInfoPanel } from "./DoubtInfoPanel";
import { RestakeWarnings } from "./RestakeWarnings";

interface RestakeDialogContentProps {
    originalPoint: {
        id: number;
        content: string;
        createdAt: Date;
        amountNegations: number;
        amountSupporters: number;
        cred: number;
    };
    counterPoint: {
        content: string;
        createdAt: Date;
    };
    favorHistory?: FavorHistoryDataPoint[];
    projectedData: Array<{
        timestamp: Date;
        favor: number;
        isProjection?: boolean;
    }>;
    isLoadingHistory: boolean;
    timelineScale: TimelineScale;
    onTimelineScaleChange: (scale: TimelineScale) => void;
    openedFromSlashedIcon: boolean;
    isSlashing: boolean;
    existingRestake?: RestakeResponse;
    reputationData?: RestakerReputationResponse;
    onShowReputationAnalysis: () => void;
    calculations: {
        favorReduced: number;
        stakeAmount: number;
        slashAmount: number;
        favorImpact: number;
        showCredLimitMessage: boolean;
        limitingFactor: string | null;
        dailyEarnings: number;
        paybackPeriod: number;
        apy: number;
    };
    existingDoubt?: DoubtResponse;
    user?: { cred: number };
    currentlyStaked: number;
    stakedCred: number;
    maxStakeAmount: number;
    endorsementReduced: boolean;
}

export const RestakeDialogContent: FC<RestakeDialogContentProps> = ({
    originalPoint,
    counterPoint,
    favorHistory,
    projectedData,
    isLoadingHistory,
    timelineScale,
    onTimelineScaleChange,
    openedFromSlashedIcon,
    isSlashing,
    existingRestake,
    reputationData,
    onShowReputationAnalysis,
    calculations,
    existingDoubt,
    user,
    currentlyStaked,
    stakedCred,
    maxStakeAmount,
    endorsementReduced,
}) => {
    return (
        <div className={cn("flex-1 min-h-0", "overflow-y-auto", "pr-1")}>
            <div className="space-y-6">
                {/* Original Point */}
                <div className="space-y-2 pb-2">
                    <div className="p-4">
                        <p className="text-lg font-medium">{originalPoint.content}</p>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-muted-foreground text-sm">
                                {format(
                                    originalPoint.createdAt,
                                    "h':'mm a '·' MMM d',' yyyy",
                                )}
                            </span>
                            <span className="inline-flex px-3 py-1 rounded-full bg-endorsed/10 text-endorsed text-sm">
                                {favorHistory?.length
                                    ? favorHistory[favorHistory.length - 1].favor
                                    : 50}{" "}
                                favor
                            </span>
                        </div>
                    </div>
                </div>

                {/* Doubt Info Panel */}
                {openedFromSlashedIcon && (
                    <DoubtInfoPanel
                        effectiveTotalRestaked={existingRestake?.effectiveAmount || 0}
                        effectiveFavorFromRestaking={existingRestake?.effectiveAmount || 0}
                        totalDoubt={stakedCred}
                        favorReduced={calculations.favorReduced}
                        resultingFavor={Math.max(0, (existingRestake?.effectiveAmount || 0) - calculations.favorReduced)}
                        paybackPeriod={calculations.paybackPeriod}
                        apy={calculations.apy}
                        dailyEarnings={calculations.dailyEarnings}
                        stakedCred={stakedCred}
                        existingRestake={existingRestake ? { oldestRestakeTimestamp: existingRestake.oldestRestakeTimestamp } : undefined}
                        reputationData={reputationData}
                        onShowReputationAnalysis={onShowReputationAnalysis}
                    />
                )}

                {/* Chart */}
                <FavorChart
                    favorHistory={favorHistory}
                    projectedData={projectedData}
                    isLoadingHistory={isLoadingHistory}
                    timelineScale={timelineScale}
                    onTimelineScaleChange={onTimelineScaleChange}
                    favorReduced={calculations.favorReduced}
                    stakeAmount={calculations.stakeAmount}
                    slashAmount={calculations.slashAmount}
                    favorImpact={calculations.favorImpact}
                    openedFromSlashedIcon={openedFromSlashedIcon}
                    isSlashing={isSlashing}
                />

                {/* Point Stats */}
                <div className="border-t pt-2">
                    <PointStats
                        className="justify-evenly ~@/lg:~text-xs/sm"
                        favor={
                            favorHistory?.length
                                ? favorHistory[favorHistory.length - 1].favor
                                : 50
                        }
                        amountNegations={originalPoint.amountNegations}
                        amountSupporters={originalPoint.amountSupporters}
                        cred={originalPoint.cred}
                    />
                    <Separator className="my-md" />
                </div>

                {/* Warnings */}
                <RestakeWarnings
                    openedFromSlashedIcon={openedFromSlashedIcon}
                    isSlashing={isSlashing}
                    endorsementReduced={endorsementReduced}
                    showCredLimitMessage={calculations.showCredLimitMessage}
                    limitingFactor={calculations.limitingFactor}
                    existingDoubt={existingDoubt}
                    user={user}
                    currentlyStaked={currentlyStaked}
                    stakedCred={stakedCred}
                    maxStakeAmount={maxStakeAmount}
                    originalPoint={{ viewerCred: undefined, ...originalPoint }}
                    slashAmount={calculations.slashAmount}
                    favorImpact={calculations.favorImpact}
                    dailyEarnings={calculations.dailyEarnings}
                />

                {/* Counter Point */}
                <p className="text-sm text-muted-foreground">
                    {openedFromSlashedIcon
                        ? `You are placing ${calculations.stakeAmount} cred in doubt of...`
                        : isSlashing
                            ? `You are losing ${calculations.slashAmount} cred for slashing${(existingDoubt?.amount ?? 0) > 0
                                ? ` (doubters will also lose ${Math.min(calculations.slashAmount, existingDoubt?.amount ?? 0)} cred)`
                                : ""
                            }...`
                            : `You would relinquish ${calculations.stakeAmount} cred if you learned...`}
                </p>

                <div className="p-4 rounded-lg border border-dashed border-border hover:bg-muted cursor-pointer">
                    <p className="text-base">{counterPoint.content}</p>
                    <span className="text-muted-foreground text-sm mt-2 block">
                        {format(counterPoint.createdAt, "h':'mm a '·' MMM d',' yyyy")}
                    </span>
                </div>
            </div>
        </div>
    );
}; 