import React from "react";
import { Button } from "@/components/ui/button";
import { RestakeIcon } from "@/components/icons/RestakeIcon";
import { DoubtIcon } from "@/components/icons/DoubtIcon";
import { cn } from "@/lib/utils/cn";

export interface RestakeDoubtControlsProps {
    isInPointPage: boolean;
    isNegation: boolean;
    parentCred?: number;
    showRestakeAmount: boolean;
    restakeIsOwner?: boolean;
    restakePercentage: number;
    isOverHundred: boolean;
    onRestake: (options: { openedFromSlashedIcon: boolean }) => void;
    doubtAmount?: number;
    doubtIsUserDoubt?: boolean;
    doubtPercentage: number;
}

export const RestakeDoubtControls: React.FC<RestakeDoubtControlsProps> = ({
    isInPointPage,
    isNegation,
    parentCred,
    showRestakeAmount,
    restakeIsOwner = false,
    restakePercentage,
    isOverHundred,
    onRestake,
    doubtAmount,
    doubtIsUserDoubt = false,
    doubtPercentage,
}) => {
    const shouldShow =
        isInPointPage || (isNegation && parentCred !== undefined && parentCred > 0);

    if (!shouldShow) return null;

    return (
        <>
            <Button
                variant="ghost"
                className={cn(
                    "p-2 -mb-2 rounded-full size-fit hover:bg-purple-500/30",
                    showRestakeAmount && "text-endorsed"
                )}
                data-action-button="true"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRestake({ openedFromSlashedIcon: false });
                }}
            >
                <RestakeIcon
                    className={cn(
                        showRestakeAmount && restakeIsOwner && "text-endorsed fill-current"
                    )}
                    showPercentage={showRestakeAmount && restakeIsOwner}
                    percentage={restakePercentage}
                />
                {showRestakeAmount && isOverHundred && (
                    <span className="ml-1 translate-y-[-1px]">+</span>
                )}
            </Button>
            <Button
                variant="ghost"
                className={cn(
                    "p-2 -mb-2 -ml-1 rounded-full size-fit hover:bg-amber-500/30",
                    doubtAmount !== undefined &&
                    doubtAmount > 0 &&
                    doubtIsUserDoubt &&
                    "text-endorsed"
                )}
                data-action-button="true"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRestake({ openedFromSlashedIcon: true });
                }}
            >
                <div className="flex items-center translate-y-[-0.5px]">
                    <DoubtIcon
                        className={cn(
                            "size-5",
                            doubtAmount !== undefined &&
                            doubtAmount > 0 &&
                            doubtIsUserDoubt &&
                            "text-endorsed fill-current"
                        )}
                        isFilled={
                            doubtAmount !== undefined && doubtAmount > 0 && doubtIsUserDoubt
                        }
                    />
                    {doubtAmount !== undefined && doubtAmount > 0 && doubtIsUserDoubt && (
                        <span className="ml-1 translate-y-[-1px]">
                            {doubtPercentage}
                            {doubtPercentage > 100 && "+"}%
                        </span>
                    )}
                </div>
            </Button>
        </>
    );
};

export default RestakeDoubtControls; 