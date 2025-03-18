import React from "react";
import { cn } from "@/lib/cn";
import { EyeIcon, CopyIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ViewpointStatsBarProps {
    views: number;
    copies: number;
    className?: string;
}

export const ViewpointStatsBar: React.FC<ViewpointStatsBarProps> = ({
    views,
    copies,
    className,
}) => {
    // Format large numbers with k/M suffixes
    const formatNumber = (num: number): string => {
        if (num >= 1_000_000) {
            return (num / 1_000_000).toFixed(1) + "M";
        } else if (num >= 1_000) {
            return (num / 1_000).toFixed(1) + "k";
        } else {
            return num.toString();
        }
    };

    return (
        <TooltipProvider>
            <div className={cn("flex items-center gap-4 text-xs text-muted-foreground", className)}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5">
                            <EyeIcon className="size-3.5" />
                            <span>{formatNumber(views)}</span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                        <p>{views} views</p>
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5">
                            <CopyIcon className="size-3.5" />
                            <span>{formatNumber(copies)}</span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                        <p>{copies} copies</p>
                    </TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    );
}; 