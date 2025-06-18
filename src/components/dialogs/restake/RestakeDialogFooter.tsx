import { FC } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface RestakeDialogFooterProps {
    openedFromSlashedIcon: boolean;
    isSlashing: boolean;
    favorImpact: number;
    favorReduced: number;
    maxStakeAmount: number;
    stakedCred: number;
    isSubmitting: boolean;
    isSubmitDisabled: boolean;
    onCancel: () => void;
    onSubmit: () => void;
}

export const RestakeDialogFooter: FC<RestakeDialogFooterProps> = ({
    openedFromSlashedIcon,
    isSlashing,
    favorImpact,
    favorReduced,
    maxStakeAmount,
    stakedCred,
    isSubmitting,
    isSubmitDisabled,
    onCancel,
    onSubmit,
}) => {
    return (
        <div
            className={cn(
                "shrink-0",
                "flex flex-col gap-2 pt-4",
                "px-0",
                "pb-5 sm:pb-0"
            )}
        >
            <div className="flex items-center justify-between pt-2">
                <span
                    className={cn(
                        "inline-flex px-3 py-1 rounded-full text-sm",
                        openedFromSlashedIcon
                            ? "bg-endorsed/10 text-endorsed"
                            : isSlashing
                                ? "bg-destructive/10 text-destructive dark:text-red-400"
                                : "bg-endorsed/10 text-endorsed",
                    )}
                >
                    {openedFromSlashedIcon ? (
                        <>-{favorReduced} favor</>
                    ) : isSlashing ? (
                        <>-{favorImpact} favor</>
                    ) : (
                        <>+{favorImpact} favor</>
                    )}
                </span>

                <div className="flex gap-3">
                    <Button variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button
                        variant="default"
                        className="bg-primary hover:bg-primary/90"
                        onClick={onSubmit}
                        disabled={isSubmitDisabled}
                    >
                        {isSubmitting ? "Submitting..." : "Submit"}
                    </Button>
                </div>
            </div>
        </div>
    );
}; 