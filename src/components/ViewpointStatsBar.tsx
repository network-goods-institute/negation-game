import React, { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { EyeIcon, CopyIcon, CoinsIcon, TrendingUpIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { fetchPoints } from "@/actions/fetchPoints";
import { useQuery } from "@tanstack/react-query";
import { Portal } from "@radix-ui/react-portal";

interface ViewpointStatsBarProps {
    views: number;
    copies: number;
    pointIds?: number[];
    className?: string;
}

export const ViewpointStatsBar: React.FC<ViewpointStatsBarProps> = ({
    views,
    copies,
    pointIds = [],
    className,
}) => {
    const [totalCred, setTotalCred] = useState<number>(0);
    const [totalFavor, setTotalFavor] = useState<number>(0);
    const [isCalculating, setIsCalculating] = useState<boolean>(false);

    const validPointIds = useMemo(() =>
        pointIds.filter((id): id is number => id !== null && id !== undefined)
        , [pointIds]);

    const { data: pointsData, isLoading } = useQuery({
        queryKey: ['viewpoint-stats-points', validPointIds],
        queryFn: async () => {
            if (validPointIds.length === 0) return [];
            return fetchPoints(validPointIds);
        },
        enabled: validPointIds.length > 0,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Calculate total cred and favor when points data is available
    useEffect(() => {
        if (isLoading) {
            setIsCalculating(true);
            return;
        }

        if (!pointsData || pointsData.length === 0) {
            setTotalCred(0);
            setTotalFavor(0);
            setIsCalculating(false);
            return;
        }

        const totalCredSum = pointsData.reduce((sum, point) => {
            return sum + (point?.cred || 0);
        }, 0);

        // Calculate average favor (sum of all favor divided by number of points)
        const totalFavorSum = pointsData.reduce((sum, point) => {
            return sum + (point?.favor || 0);
        }, 0);

        const avgFavor = pointsData.length > 0 ? Math.round(totalFavorSum / pointsData.length) : 0;

        setTotalCred(totalCredSum);
        setTotalFavor(avgFavor);
        setIsCalculating(false);
    }, [pointsData, isLoading]);

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
            <div className={cn("flex items-center gap-4 text-xs text-muted-foreground", className)}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5">
                            <EyeIcon className="size-3.5" />
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
                        <div className="flex items-center gap-1.5">
                            <CopyIcon className="size-3.5" />
                            <span>{formatNumber(copies)}</span>
                        </div>
                    </TooltipTrigger>
                    <Portal>
                        <TooltipContent side="top" className="text-xs z-[100]">
                            <p>{copies} copies</p>
                        </TooltipContent>
                    </Portal>
                </Tooltip>

                {validPointIds.length > 0 && (
                    <>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex items-center gap-1.5">
                                    <CoinsIcon className="size-3.5" />
                                    <span>
                                        {isCalculating ? "Calculating..." : formatNumber(totalCred)}
                                    </span>
                                </div>
                            </TooltipTrigger>
                            <Portal>
                                <TooltipContent side="top" className="text-xs z-[100]">
                                    <p>
                                        {isCalculating
                                            ? "Calculating total cred..."
                                            : `${totalCred} total cred endorsed`}
                                    </p>
                                </TooltipContent>
                            </Portal>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex items-center gap-1.5">
                                    <TrendingUpIcon className="size-3.5" />
                                    <span>
                                        {isCalculating ? "Calculating..." : `${totalFavor}`}
                                    </span>
                                </div>
                            </TooltipTrigger>
                            <Portal>
                                <TooltipContent side="top" className="text-xs z-[100]">
                                    <p>
                                        {isCalculating
                                            ? "Calculating viewpoint favor..."
                                            : `Viewpoint favor: ${totalFavor}`}
                                    </p>
                                </TooltipContent>
                            </Portal>
                        </Tooltip>
                    </>
                )}
            </div>
        </TooltipProvider>
    );
}; 