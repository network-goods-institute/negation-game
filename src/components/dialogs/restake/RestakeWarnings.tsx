import { FC } from "react";
import { AlertCircle, InfoIcon } from "lucide-react";

interface RestakeWarningsProps {
    openedFromSlashedIcon: boolean;
    isSlashing: boolean;
    endorsementReduced: boolean;
    showCredLimitMessage: boolean;
    limitingFactor: string | null;
    existingDoubt?: {
        amount: number;
        userAmount: number;
        isUserDoubt: boolean;
    } | null;
    user?: {
        cred: number;
    };
    currentlyStaked: number;
    stakedCred: number;
    maxStakeAmount: number;
    originalPoint: {
        viewerCred?: number;
    };
    slashAmount: number;
    favorImpact: number;
    dailyEarnings: number;
}

export const RestakeWarnings: FC<RestakeWarningsProps> = ({
    openedFromSlashedIcon,
    isSlashing,
    endorsementReduced,
    showCredLimitMessage,
    limitingFactor,
    existingDoubt,
    user,
    currentlyStaked,
    stakedCred,
    maxStakeAmount,
    originalPoint,
    slashAmount,
    favorImpact,
    dailyEarnings,
}) => {
    return (
        <div className="space-y-4">
            {/* Low payout warning for doubts */}
            {openedFromSlashedIcon && dailyEarnings < 5 && stakedCred > 0 && (
                <div className="flex flex-col gap-2 text-sm bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-md p-3">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="size-4 shrink-0" />
                        <p className="font-medium">Warning: Low payout detected.</p>
                    </div>
                    <p>This could be due to:</p>
                    <ul className="list-disc pl-5">
                        <li>Low favor on this counterpoint</li>
                        <li>Recent negation with limited restakes</li>
                        <li>Low overall engagement</li>
                        <li>Improper amount of cred doubted</li>
                    </ul>
                </div>
            )}

            {/* Slashing warning */}
            {!openedFromSlashedIcon && isSlashing && (
                <div className="flex items-center gap-2 text-sm bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-md p-3">
                    <AlertCircle className="size-4 shrink-0" />
                    <p>
                        Reducing your stake will slash your restaked cred from the
                        original point. You&apos;ll give up{" "}
                        {currentlyStaked - stakedCred} cred.
                    </p>
                </div>
            )}

            {/* Slashing with existing doubts warning */}
            {!openedFromSlashedIcon &&
                isSlashing &&
                (existingDoubt?.amount ?? 0) > 0 && (
                    <div className="flex items-center gap-2 text-sm bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-md p-3">
                        <InfoIcon className="size-4 shrink-0" />
                        <p>
                            Due to existing doubts ({existingDoubt?.amount ?? 0} cred)
                            {existingDoubt?.isUserDoubt
                                ? ` (including your ${existingDoubt?.userAmount ?? 0} cred doubt)`
                                : ""}
                            , slashing will only reduce favor by {favorImpact} instead
                            of {slashAmount}
                        </p>
                    </div>
                )}

            {/* Cred limit warning */}
            {showCredLimitMessage && (
                <div className="flex items-center gap-2 text-sm bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-md p-3">
                    <InfoIcon className="size-4 shrink-0" />
                    <p>
                        {openedFromSlashedIcon ? "Doubt" : "Stake"} amount limited by
                        your available cred ({user?.cred} cred)
                    </p>
                </div>
            )}

            {/* Endorsement reduced warning */}
            {endorsementReduced && (
                <div className="flex items-center gap-2 text-sm bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-md p-3">
                    <AlertCircle className="size-4 shrink-0" />
                    <p>
                        {openedFromSlashedIcon
                            ? "The maximum doubt amount has been reduced because some endorsement cred was used for doubt payouts."
                            : isSlashing
                                ? "You can still slash your restake, but the maximum amount has been reduced due to endorsement payouts."
                                : "The maximum restake amount has been reduced because some endorsement cred was used for doubt payouts."}
                    </p>
                </div>
            )}

            {/* Slash amount capped warning */}
            {isSlashing && endorsementReduced && (
                <div className="flex items-center gap-2 text-sm bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-md p-3">
                    <AlertCircle className="size-4 shrink-0" />
                    <p>
                        Your maximum slash amount has been reduced to{" "}
                        {originalPoint.viewerCred} cred due to endorsement payouts.
                    </p>
                </div>
            )}

            {/* Limiting factor info */}
            {openedFromSlashedIcon && limitingFactor && (
                <div className="flex items-center gap-2 text-sm bg-muted/30 rounded-md p-3">
                    <InfoIcon className="size-4 shrink-0" />
                    <p>
                        Maximum doubt amount is limited by {limitingFactor} (
                        {maxStakeAmount} cred)
                    </p>
                </div>
            )}

            {/* Doubt immutability warning */}
            {openedFromSlashedIcon &&
                existingDoubt?.isUserDoubt &&
                existingDoubt.userAmount > 0 && (
                    <div className="flex items-center gap-2 text-sm bg-muted/30 rounded-md p-3">
                        <InfoIcon className="size-4 shrink-0" />
                        <p>
                            You already have an active doubt of{" "}
                            {existingDoubt.userAmount} cred. Doubts cannot be decreased after creation, only increased.
                        </p>
                    </div>
                )}
        </div>
    );
}; 