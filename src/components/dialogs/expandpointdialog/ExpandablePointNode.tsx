import { Button } from "@/components/ui/button";
import { PointStats } from "@/components/cards/pointcard/PointStats";
import {
    ExternalLinkIcon,
    PlusIcon,
    MinusIcon,
    CircleIcon
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePointData } from "@/queries/points/usePointData";
import { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { hoveredPointIdAtom } from "@/atoms/hoveredPointIdAtom";
import { getPointUrl } from "@/lib/negation-game/getPointUrl";
import { usePrivy } from "@privy-io/react-auth";
import { useCurrentSpace } from "@/hooks/utils/useCurrentSpace";import { logger } from "@/lib/logger";

export interface ExpandablePoint {
    pointId: number;
    parentId?: string | number;
    searchTerm: string;
    isMobile?: boolean;
    dialogPosition: { x: number; y: number };
    isVisited: boolean;
    onMarkAsRead: (pointId: number) => void;
    onZoomToNode: (pointId: number) => void;
}

interface ExpandablePointNodeProps {
    point: ExpandablePoint;
    isSelected: boolean;
    isExpanded: boolean;
    onSelect: (point: ExpandablePoint) => void;
    onRemove?: (point: ExpandablePoint) => void;
    onDirectAdd?: (point: ExpandablePoint) => void;
    searchTerm: string;
    isMobile?: boolean;
    isVisited: boolean;
    onMarkAsRead: (pointId: number) => void;
    onZoomToNode: (pointId: number) => void;
}

export const ExpandablePointNode: React.FC<ExpandablePointNodeProps> = ({
    point,
    isSelected,
    isExpanded,
    onSelect,
    onRemove,
    onDirectAdd,
    searchTerm,
    isMobile = false,
    isVisited,
    onMarkAsRead,
    onZoomToNode,
}) => {
    const { data: pointData, isLoading } = usePointData(point.pointId);
    const currentSpace = useCurrentSpace();
    const [isVisible, setIsVisible] = useState(true);
    const [isActive, setIsActive] = useState(false);
    const [hoveredPointId, setHoveredPointId] = useAtom(hoveredPointIdAtom);
    const { user: privyUser } = usePrivy();

    useEffect(() => {
        if (!searchTerm.trim() || !pointData) {
            setIsVisible(true);
            return;
        }

        try {
            const matches = pointData.content.toLowerCase().includes(searchTerm.toLowerCase());
            setIsVisible(matches);
        } catch (e) {
            logger.error(`Error filtering point ${point.pointId}:`, e);
            setIsVisible(false);
        }
    }, [searchTerm, pointData, point.pointId]);

    const handleMouseEnter = () => {
        setHoveredPointId(point.pointId);
    };

    const handleMouseLeave = () => {
        setHoveredPointId(undefined);
    };

    if (!pointData || isLoading) {
        return (
            <div className={cn(
                "w-full bg-muted animate-pulse rounded-md",
                isMobile ? "h-20" : "h-24"
            )} />
        );
    }

    if (!isVisible) {
        return null;
    }

    return (
        <div
            className={cn(
                "flex flex-col bg-background border-2 rounded-md transition-colors shadow-sm relative",
                isMobile ? "min-h-20" : "min-h-28",
                isSelected && !isExpanded && "border-purple-500 ring-2 ring-purple-500/30",
                !isSelected && !isExpanded && "border-muted-foreground/20",
                isExpanded && "border-gray-400/50 bg-gray-200/20 dark:bg-gray-800/20",
                isActive && "bg-yellow-500/5",
                hoveredPointId === point.pointId && "shadow-[inset_0_0_0_2px_yellow]",
                "cursor-pointer hover:bg-yellow-500/5 active:bg-yellow-500/10"
            )}
            onClick={() => {
                if (isExpanded) {
                    onZoomToNode(point.pointId);
                } else {
                    onSelect(point);
                }
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onTouchStart={() => setIsActive(true)}
            onTouchEnd={() => setIsActive(false)}
            onTouchCancel={() => setIsActive(false)}
            onMouseDown={() => setIsActive(true)}
            onMouseUp={() => setIsActive(false)}
            title={`Point ID: ${point.pointId}`}
        >
            <div className={cn(
                "flex flex-col",
                isMobile ? "p-2 gap-1" : "p-3 gap-1.5"
            )}>
                <span className={cn(
                    "font-medium line-clamp-3",
                    isMobile ? "text-xs" : "text-sm"
                )}>
                    {pointData.content}
                </span>

                <div className="flex justify-between items-center mt-1">
                    <PointStats
                        favor={pointData.favor}
                        amountNegations={pointData.amountNegations}
                        amountSupporters={pointData.amountSupporters}
                        cred={pointData.cred}
                        className={isMobile ? "scale-75 origin-left" : ""}
                    />

                    <div className="flex items-center gap-2">
                        {isExpanded ? (
                            <Button
                                variant="default"
                                size="sm"
                                className={cn(
                                    "rounded-full flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white",
                                    isMobile ? "h-6 px-1.5 py-0.5" : "h-7 px-2 py-1"
                                )}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onRemove) onRemove(point);
                                }}
                            >
                                <MinusIcon className={isMobile ? "size-2.5" : "size-3"} />
                                <span className={isMobile ? "text-[9px]" : "text-xs"}>Remove</span>
                            </Button>
                        ) : (
                            <Button
                                variant="default"
                                size="sm"
                                className={cn(
                                    "rounded-full flex items-center gap-1 bg-purple-500 hover:bg-purple-600",
                                    isMobile ? "h-6 px-1.5 py-0.5" : "h-7 px-2 py-1",
                                )}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onDirectAdd) {
                                        onDirectAdd(point);
                                    }
                                }}
                            >
                                <PlusIcon className={isMobile ? "size-2.5" : "size-3"} />
                                <span className={isMobile ? "text-[9px]" : "text-xs"}>Add</span>
                            </Button>
                        )}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "p-0 rounded-full",
                                        isMobile ? "h-5 w-5" : "h-6 w-6"
                                    )}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!currentSpace) return;
                                        window.open(
                                            getPointUrl(point.pointId, currentSpace),
                                            '_blank',
                                            'noopener,noreferrer'
                                        );
                                    }}
                                >
                                    <ExternalLinkIcon className={isMobile ? "h-3 w-3" : "h-3.5 w-3.5"} />
                                    <span className="sr-only">Open in new tab</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                <p>Open in new tab</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            </div>
            {!isVisited && privyUser && (
                <div className="absolute top-0.5 right-1 group flex items-center gap-2">
                    <span className={cn(
                        "text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity",
                        isMobile ? "text-[8px]" : "text-xs"
                    )}>
                        Tap to mark seen
                    </span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onMarkAsRead(point.pointId);
                        }}
                        className={cn(
                            "relative rounded-full flex items-center justify-center",
                            isMobile ? "size-2" : "size-3"
                        )}
                        aria-label="Mark as seen"
                    >
                        <div className={cn(
                            "absolute inset-0 bg-endorsed/20 rounded-full scale-0 group-hover:scale-150 transition-transform",
                            isMobile ? "-m-1" : "-m-1.5"
                        )} />
                        <CircleIcon className="size-full fill-endorsed text-endorsed relative" />
                    </button>
                </div>
            )}
        </div>
    );
}; 