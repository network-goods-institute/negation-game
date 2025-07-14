import React from "react";
import { RestakeButton } from "@/components/buttons/RestakeButton";
import { DoubtButton } from "@/components/buttons/DoubtButton";

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
            <RestakeButton
                percentage={showRestakeAmount && restakeIsOwner ? restakePercentage : undefined}
                isActive={showRestakeAmount && restakeIsOwner}
                showText={false}
                className="[&_.size-7]:!w-5 [&_.size-7]:!h-5"
                data-action-button="true"
                onClick={(e) => {
                    e?.preventDefault();
                    e?.stopPropagation();
                    onRestake({ openedFromSlashedIcon: false });
                }}
            >
                {showRestakeAmount && isOverHundred && (
                    <span className="ml-1 translate-y-[-1px]">+</span>
                )}
            </RestakeButton>
            <DoubtButton
                userAmount={doubtAmount !== undefined && doubtAmount > 0 && doubtIsUserDoubt ? doubtAmount : undefined}
                isActive={doubtAmount !== undefined && doubtAmount > 0 && doubtIsUserDoubt}
                showText={false}
                className="[&>svg]:!w-5 [&>svg]:!h-5"
                data-action-button="true"
                onClick={(e) => {
                    e?.preventDefault();
                    e?.stopPropagation();
                    onRestake({ openedFromSlashedIcon: true });
                }}
            >
                {doubtAmount !== undefined && doubtAmount > 0 && doubtIsUserDoubt && (
                    <span className="ml-1 translate-y-[-1px]">
                        {doubtPercentage}
                        {doubtPercentage > 100 && "+"}%
                    </span>
                )}
            </DoubtButton>
        </>
    );
};

export default RestakeDoubtControls; 