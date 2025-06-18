import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DialogProps } from "@radix-ui/react-dialog";
import { FC } from "react";
import { Check, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils/cn";

interface SubmittedValues {
    slashAmount: number;
    stakeAmount: number;
    currentlyStaked: number;
    maxStakeAmount: number;
    stakePercentage: number;
    bonusFavor: number;
    isSlashing: boolean;
    collectedEarnings: number;
}

interface RestakeDialogSuccessProps extends DialogProps {
    submittedValues: SubmittedValues;
    openedFromSlashedIcon: boolean;
    existingDoubtIsUserDoubt: boolean;
    originalPoint: {
        id: number;
        content: string;
        createdAt: Date;
    };
    counterPoint: {
        id: number;
        content: string;
        createdAt: Date;
    };
}

export const RestakeDialogSuccess: FC<RestakeDialogSuccessProps> = ({
    submittedValues,
    openedFromSlashedIcon,
    existingDoubtIsUserDoubt,
    originalPoint,
    counterPoint,
    open,
    onOpenChange,
    ...props
}) => {
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
                                <DialogTitle className="text-xl">
                                    {existingDoubtIsUserDoubt ? "Doubt Increased" : "Doubt Placed"}
                                </DialogTitle>
                                <p className="text-muted-foreground">
                                    You&apos;ve {existingDoubtIsUserDoubt ? "increased your doubt to " : "placed"}
                                    {submittedValues.stakeAmount} cred
                                </p>
                                {submittedValues.collectedEarnings > 0 && (
                                    <p className="text-sm text-endorsed mt-2">
                                        +{submittedValues.collectedEarnings} cred collected from previous earnings
                                    </p>
                                )}
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
                                    You&apos;ve slashed{" "}
                                    <span className="text-destructive dark:text-red-400">
                                        {submittedValues.slashAmount} cred
                                    </span>{" "}
                                    from your stake
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="rounded-full bg-endorsed/10 p-3 mb-6">
                                <Check className="size-6 text-endorsed" />
                            </div>

                            <div className="space-y-2 mb-6">
                                <DialogTitle className="text-xl">
                                    Successfully Restaked!
                                </DialogTitle>
                                <p className="text-muted-foreground">
                                    You&apos;ve added{" "}
                                    <span className="text-endorsed">
                                        +{submittedValues.bonusFavor} favor
                                    </span>{" "}
                                    to your point
                                </p>
                            </div>
                        </>
                    )}

                    <div className="w-full space-y-6">
                        <div className="space-y-2 p-4">
                            <p className="text-base">{originalPoint.content}</p>
                            <span className="text-sm text-muted-foreground">
                                {format(
                                    originalPoint.createdAt,
                                    "h':'mm a '·' MMM d',' yyyy",
                                )}
                            </span>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                                {openedFromSlashedIcon
                                    ? `You've doubted ${submittedValues.stakeAmount} cred against the possibility of restakers slashing...`
                                    : submittedValues.isSlashing
                                        ? `You are losing ${submittedValues.slashAmount} cred for slashing...`
                                        : `You would relinquish ${submittedValues.stakeAmount} cred if you learned...`}
                            </p>
                            <div className="p-4 rounded-lg border border-dashed border-border hover:bg-muted cursor-pointer">
                                <p className="text-base">{counterPoint.content}</p>
                                <span className="text-muted-foreground text-sm mt-2 block">
                                    {format(
                                        counterPoint.createdAt,
                                        "h':'mm a '·' MMM d',' yyyy",
                                    )}
                                </span>
                            </div>
                        </div>

                        <div
                            className={cn(
                                "rounded-lg px-4 py-3",
                                openedFromSlashedIcon
                                    ? "bg-endorsed/10"
                                    : submittedValues.isSlashing
                                        ? "bg-destructive/10"
                                        : "bg-muted/30",
                            )}
                        >
                            <p className="text-sm text-muted-foreground">
                                {openedFromSlashedIcon
                                    ? "Amount Doubted"
                                    : submittedValues.isSlashing
                                        ? "Amount Slashed"
                                        : "Amount Restaked"}
                            </p>
                            <p className="text-lg">
                                {openedFromSlashedIcon
                                    ? `${submittedValues.stakeAmount} / ${submittedValues.maxStakeAmount} cred (${submittedValues.stakePercentage}%)`
                                    : submittedValues.isSlashing
                                        ? `${submittedValues.slashAmount} / ${submittedValues.currentlyStaked} cred (${Math.round((submittedValues.slashAmount / submittedValues.currentlyStaked) * 100)}%)`
                                        : `${submittedValues.stakeAmount} / ${submittedValues.maxStakeAmount} cred (${submittedValues.stakePercentage}%)`}
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
}; 