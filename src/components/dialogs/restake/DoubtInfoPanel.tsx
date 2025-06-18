import { FC } from "react";
import { InfoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

interface DoubtInfoPanelProps {
    effectiveTotalRestaked: number;
    effectiveFavorFromRestaking: number;
    totalDoubt: number;
    favorReduced: number;
    resultingFavor: number;
    paybackPeriod: number;
    apy: number;
    dailyEarnings: number;
    stakedCred: number;
    existingRestake?: {
        oldestRestakeTimestamp?: Date | null;
    };
    reputationData?: {
        aggregateReputation: number;
    };
    onShowReputationAnalysis: () => void;
}

export const DoubtInfoPanel: FC<DoubtInfoPanelProps> = ({
    effectiveTotalRestaked,
    effectiveFavorFromRestaking,
    totalDoubt,
    favorReduced,
    resultingFavor,
    paybackPeriod,
    apy,
    dailyEarnings,
    stakedCred,
    existingRestake,
    reputationData,
    onShowReputationAnalysis,
}) => {
    return (
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
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                                You can only doubt restakes that existed when you place your doubt.
                                Earnings are calculated based on the endorsements that existed at that time.
                            </p>
                            <Separator className="my-2" />
                            <p className="text-sm text-muted-foreground">
                                APY Formula:{" "}
                                <code>APY = e^(ln(0.05) + ln(negation_favor))</code>
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Base APY of 5% is modified by the negation&apos;s
                                favor. Higher favor on the negation point increases
                                potential earnings.
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Daily earnings = (APY × doubt_amount) / 365
                            </p>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            {/* First Row - 3 items */}
            <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col p-2 bg-muted/40 rounded-lg">
                    <span className="text-[10px] text-muted-foreground">
                        Total cred available to doubt
                    </span>
                    <span className="text-sm text-muted-foreground mt-1">
                        {effectiveTotalRestaked}
                    </span>
                    {existingRestake?.oldestRestakeTimestamp && (
                        <span className="text-[10px] text-muted-foreground mt-1">
                            since {format(existingRestake.oldestRestakeTimestamp, "MMM d, yyyy")}
                        </span>
                    )}
                </div>

                <div className="flex flex-col p-2 bg-muted/40 rounded-lg">
                    <span className="text-[10px] text-muted-foreground">
                        Total favor from restaking
                    </span>
                    <span className="text-sm text-muted-foreground mt-1">
                        {effectiveFavorFromRestaking}
                    </span>
                </div>

                <div className="flex flex-col p-2 bg-muted/40 rounded-lg">
                    <span className="text-[10px] text-muted-foreground">
                        Total doubt
                    </span>
                    <span className="text-sm text-muted-foreground mt-1">
                        {totalDoubt}
                    </span>
                </div>
            </div>

            {/* Second Row - 3 items */}
            <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col p-3 bg-muted/40 rounded-lg">
                    <span className="text-xs font-medium">Favor Reduced</span>
                    <div className="mt-2 space-y-0.5">
                        <div className="text-lg text-endorsed">
                            -{favorReduced}
                        </div>
                        <div className="text-sm text-muted-foreground">favor</div>
                        <div className="text-xs text-muted-foreground">
                            {resultingFavor} remaining
                        </div>
                    </div>
                </div>

                <div className="flex flex-col p-3 bg-muted/40 rounded-lg">
                    <span className="text-xs font-medium">Time to ROI</span>
                    <div className="mt-2 space-y-0.5">
                        <div className="text-lg">{paybackPeriod}</div>
                        <div className="text-sm text-muted-foreground">
                            days until
                        </div>
                        <div className="text-sm text-muted-foreground">
                            breakeven
                        </div>
                    </div>
                </div>

                <div className="flex flex-col p-3 bg-muted/40 rounded-lg">
                    <span className="text-xs font-medium">APY</span>
                    <div className="mt-2 space-y-0.5">
                        <div className="text-lg text-endorsed">{apy}%</div>
                        <div className="text-sm text-muted-foreground">
                            {dailyEarnings.toFixed(2)} cred/day
                        </div>
                    </div>
                </div>
            </div>

            {stakedCred >= 0 && (
                <div className="flex items-center gap-2 text-sm">
                    <InfoIcon className="size-4 shrink-0" />
                    <p>
                        For every cred that the restaker slashes you&apos;ll lose
                        one cred out of the amount you&apos;ve doubted
                    </p>
                </div>
            )}

            {/* Reputation Section */}
            <div
                className="flex items-center justify-between p-3 bg-muted/40 rounded-lg cursor-pointer hover:bg-muted/60"
                onClick={onShowReputationAnalysis}
            >
                <div>
                    <span className="text-xs font-medium">
                        Restaker Reputation
                    </span>
                    <div className="text-lg mt-1">
                        {reputationData?.aggregateReputation ?? 50}%
                    </div>
                </div>
                <span className="text-muted-foreground">→</span>
            </div>

            {/* Earnings Summary */}
            <div className="space-y-2 mt-4">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                        Estimated Daily Earnings
                    </span>
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
        </div>
    );
}; 