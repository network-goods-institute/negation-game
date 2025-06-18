import { FC } from "react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils/cn";

interface RestakeSliderControlsProps {
    stakedCred: number; // Current value selected on slider
    maxStakeAmount: number; // Maximum amount that can be selected
    onSliderChange: (values: number[]) => void;
    openedFromSlashedIcon: boolean; // Whether in doubt mode vs restake mode
    isSlashing: boolean; // Whether slider value is below current restake (reducing)
    currentlyStaked: number; // User's current active restake amount
    stakeAmount: number; // Amount that will be restaked (when not slashing)
    slashAmount: number; // Amount that will be slashed (when reducing)
    existingDoubt?: {
        userAmount: number;
    } | null;
}

export const RestakeSliderControls: FC<RestakeSliderControlsProps> = ({
    stakedCred,
    maxStakeAmount,
    onSliderChange,
    openedFromSlashedIcon,
    isSlashing,
    currentlyStaked,
    stakeAmount,
    slashAmount,
    existingDoubt,
}) => {
    return (
        <div className={cn("space-y-4", maxStakeAmount === 0 && "opacity-50")}>
            <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                    {openedFromSlashedIcon ? "Doubt Amount" : "Impact"}
                </span>
                <span className="text-sm text-muted-foreground">
                    {openedFromSlashedIcon ? (
                        <>
                            {stakeAmount} / {maxStakeAmount} cred (
                            {Math.round((stakedCred / maxStakeAmount) * 100)}%)
                        </>
                    ) : isSlashing ? (
                        <>
                            {slashAmount} / {currentlyStaked} slashed (
                            {currentlyStaked > 0
                                ? Math.round((slashAmount / currentlyStaked) * 100)
                                : 0}
                            %)
                        </>
                    ) : (
                        <>
                            {stakeAmount} / {maxStakeAmount} staked (
                            {maxStakeAmount > 0
                                ? Math.round((stakedCred / maxStakeAmount) * 100)
                                : 0}
                            %)
                        </>
                    )}
                </span>
            </div>

            <Slider
                value={[stakedCred]}
                onValueChange={onSliderChange}
                max={maxStakeAmount}
                step={1}
                className="w-full"
                destructive={!openedFromSlashedIcon && isSlashing}
                disabled={maxStakeAmount === 0}
                existingCred={
                    openedFromSlashedIcon
                        ? (existingDoubt?.userAmount ?? 0)
                        : currentlyStaked
                }
                isDoubtMode={openedFromSlashedIcon}
            />
        </div>
    );
}; 