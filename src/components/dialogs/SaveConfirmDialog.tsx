import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { Loader } from "@/components/ui/loader";
import useIsMobile from "@/hooks/ui/useIsMobile";

export interface SaveConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaveExisting: () => Promise<boolean | void>;
    onSaveAsNew: () => Promise<boolean | void>;
    onCancel: () => void;
    className?: string;
    viewCountSinceLastUpdate?: number;
    lastUpdated?: Date;
    isProcessing: boolean;
    saveAction: "existing" | "new" | null;
}

export const SaveConfirmDialog = ({
    open,
    onOpenChange,
    onSaveExisting,
    onSaveAsNew,
    onCancel,
    className,
    viewCountSinceLastUpdate,
    lastUpdated,
    isProcessing,
    saveAction,
}: SaveConfirmDialogProps) => {
    const isMobile = useIsMobile();

    const daysSinceUpdate = lastUpdated
        ? Math.floor((Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    const handleOpenChange = (newOpenState: boolean) => {
        onOpenChange(newOpenState);
        if (!newOpenState) {
            onCancel();
        }
    };

    const getReasonMessage = () => {
        if (daysSinceUpdate >= 2 && viewCountSinceLastUpdate && viewCountSinceLastUpdate >= 15) {
            return `This rationale hasn't been updated in ${daysSinceUpdate} days and has been viewed ${viewCountSinceLastUpdate} times since the last update.`;
        } else if (daysSinceUpdate >= 2) {
            return `This rationale hasn't been updated in ${daysSinceUpdate} days.`;
        } else if (viewCountSinceLastUpdate && viewCountSinceLastUpdate >= 15) {
            return `This rationale has been viewed ${viewCountSinceLastUpdate} times since the last update.`;
        }
        return "";
    };

    return (
        <AlertDialog open={open} onOpenChange={handleOpenChange}>
            <AlertDialogContent className={cn("sm:max-w-[425px]", className)}>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Publishing Changes</AlertDialogTitle>
                    <AlertDialogDescription>
                        {getReasonMessage()}
                        <span className="mt-2 block">
                            Would you like to update the existing rationale or save it as a new one?
                        </span>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className={cn(
                    "gap-2",
                    isMobile ? "flex flex-col" : "flex flex-row"
                )}>
                    <AlertDialogCancel
                        disabled={isProcessing}
                        onClick={onCancel}
                        className={cn(
                            "mt-0 h-8 text-xs px-3",
                            isMobile && "w-full"
                        )}
                    >
                        Cancel
                    </AlertDialogCancel>
                    <Button
                        onClick={onSaveAsNew}
                        disabled={isProcessing}
                        variant="secondary"
                        className={cn(
                            "h-8 text-xs px-3",
                            isMobile ? "w-full" : "flex-1"
                        )}
                        size="sm"
                    >
                        {isProcessing && saveAction === "new" ? (
                            <div className="flex items-center justify-center gap-2">
                                <Loader className="size-3 animate-spin" />
                                <span>Saving...</span>
                            </div>
                        ) : (
                            "Save as New Rationale"
                        )}
                    </Button>
                    <Button
                        onClick={onSaveExisting}
                        disabled={isProcessing}
                        className={cn(
                            "h-8 text-xs px-3",
                            isMobile ? "w-full" : "flex-1"
                        )}
                        size="sm"
                    >
                        {isProcessing && saveAction === "existing" ? (
                            <div className="flex items-center justify-center gap-2">
                                <Loader className="size-3 animate-spin text-white" />
                                <span>Updating...</span>
                            </div>
                        ) : (
                            "Update Existing"
                        )}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}; 