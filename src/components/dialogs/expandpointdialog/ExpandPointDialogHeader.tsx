import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ExpandPointDialogHeaderProps {
    isMobile: boolean;
    onClose: () => void;
}

export const ExpandPointDialogHeader: React.FC<ExpandPointDialogHeaderProps> = ({ isMobile, onClose }) => {
    return (
        <div className={cn(
            "modal-header flex justify-between items-center border-b bg-background cursor-move",
            isMobile ? "px-2 py-2" : "px-4 py-3"
        )}>
            <h3 className={cn(
                "font-medium",
                isMobile ? "text-xs" : "text-sm"
            )}>
                Add Points to Rationale
            </h3>
            <Button
                variant="ghost"
                size="icon"
                className={isMobile ? "h-6 w-6" : "h-7 w-7"}
                onClick={onClose}
            >
                <XIcon className={isMobile ? "h-3 w-3" : "h-4 w-4"} />
            </Button>
        </div>
    );
}; 