import React, { useCallback } from "react";
import { cn } from "@/lib/utils/cn";
import { EyeIcon, CopyIcon, CoinsIcon, TrendingUpIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Portal } from "@radix-ui/react-portal";

interface ViewpointStatsBarProps {
    views: number;
    copies: number;
    totalCred?: number;
    averageFavor?: number;
    className?: string;
}

export const ViewpointStatsBar: React.FC<ViewpointStatsBarProps> = ({
    views,
    copies,
    totalCred = 0,
    averageFavor = 0,
    className,
}) => {
    const formatNumber = useCallback((num: number): string => {
        if (num >= 1_000_000) {
            return (num / 1_000_000).toFixed(1) + "M";
        } else if (num >= 1_000) {
            return (num / 1_000).toFixed(1) + "k";
        } else {
            return num.toString();
        }
    }, []);

    return (
        <TooltipProvider>
            <div className={cn("flex items-center gap-2 md:gap-4 text-[10px] md:text-xs text-muted-foreground", className)}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 md:gap-1.5">
                            <EyeIcon className="size-3 md:size-3.5" />
                            <span>{formatNumber(views)}</span>
                        </div>
                    </TooltipTrigger>
                    <Portal>
                        <TooltipContent side="top" className="text-xs z-[100]">
                            <p>{views} views</p>
                        </TooltipContent>
                    </Portal>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 md:gap-1.5">
                            <CopyIcon className="size-3 md:size-3.5" />
                            <span>{formatNumber(copies)}</span>
                        </div>
                    </TooltipTrigger>
                    <Portal>
                        <TooltipContent side="top" className="text-xs z-[100]">
                            <p>{copies} copies</p>
                        </TooltipContent>
                    </Portal>
                </Tooltip>

                {(totalCred > 0 || averageFavor > 0) && (
                    <>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 md:gap-1.5">
                                    <CoinsIcon className="size-3 md:size-3.5" />
                                    <span>{formatNumber(totalCred)}</span>
                                </div>
                            </TooltipTrigger>
                            <Portal>
                                <TooltipContent side="top" className="text-xs z-[100]">
                                    <p>{totalCred} total cred endorsed</p>
                                </TooltipContent>
                            </Portal>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 md:gap-1.5">
                                    <TrendingUpIcon className="size-3 md:size-3.5" />
                                    <span>{averageFavor}</span>
                                </div>
                            </TooltipTrigger>
                            <Portal>
                                <TooltipContent side="top" className="text-xs z-[100]">
                                    <p>Viewpoint favor: {averageFavor}</p>
                                </TooltipContent>
                            </Portal>
                        </Tooltip>
                    </>
                )}
            </div>
        </TooltipProvider>
    );
}; 