import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

interface ExpandPointDialogFooterProps {
    isMobile: boolean;
    onSubmit: () => void;
    selectedPointsSize: number;
    isSubmitting: boolean;
}

export const ExpandPointDialogFooter: React.FC<ExpandPointDialogFooterProps> = ({
    isMobile,
    onSubmit,
    selectedPointsSize,
    isSubmitting,
}) => {
    return (
        <div className={cn(
            "border-t bg-background",
            isMobile ? "px-2 py-2" : "px-3 py-3.5"
        )}>
            <Button
                className={cn(
                    "w-full relative",
                    isMobile ? "h-8 text-sm" : "h-9"
                )}
                onClick={onSubmit}
                disabled={selectedPointsSize === 0 || isSubmitting}
            >
                {isSubmitting ? (
                    <>
                        <span className="opacity-0">Add</span>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="size-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                        </div>
                    </>
                ) : (
                    selectedPointsSize > 0 ? `Add Selected (${selectedPointsSize})` : "Add Selected"
                )}
            </Button>
        </div>
    );
}; 