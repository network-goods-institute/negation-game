import { useRouter } from "next/navigation";
import { FC, useCallback, useMemo, useState, useEffect, memo, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { usePrivy } from "@privy-io/react-auth";
import { useQueries } from "@tanstack/react-query";
import { usePointData } from "@/queries/usePointData";
import { PointCard } from "./PointCard";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { ArrowLeftIcon, SearchIcon, XIcon, CheckIcon, CopyIcon, ExternalLinkIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { DialogProps } from "@radix-ui/react-dialog";
import { useFeed } from "@/queries/useFeed";
import { getPointUrl } from "@/lib/getPointUrl";
import { useSetAtom } from "jotai";
import { negatedPointIdAtom } from "@/atoms/negatedPointIdAtom";
import { Skeleton } from "./ui/skeleton";
import { toast } from "sonner";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useUser } from "@/queries/useUser";

interface SharePointsDialogProps extends DialogProps {
    isViewMode?: boolean;
    sharedBy?: string;
    initialPoints?: number[];
}

interface PointCardWrapperProps {
    pointId: number;
    isSelected: boolean;
    onSelect?: () => void;
    isViewMode?: boolean;
}

const MemoizedPointCard = memo(PointCard);

const PointCardWrapper: FC<PointCardWrapperProps> = memo(({ pointId, isSelected, onSelect, isViewMode }) => {
    const { data: pointData, isLoading } = usePointData(pointId);
    const { login, user: privyUser } = usePrivy();
    const setNegatedPointId = useSetAtom(negatedPointIdAtom);

    if (!pointData || isLoading) {
        return (
            <div className="w-full h-24 bg-muted animate-pulse rounded-md" />
        );
    }

    return (
        <div className="relative">
            <MemoizedPointCard
                className="flex-grow p-4"
                favor={pointData.favor}
                content={pointData.content}
                createdAt={pointData.createdAt}
                amountSupporters={pointData.amountSupporters}
                amountNegations={pointData.amountNegations}
                pointId={pointData.pointId}
                cred={pointData.cred}
                viewerContext={{ viewerCred: pointData.viewerCred }}
                linkDisabled={true}
                disablePopover={true}
                onNegate={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (privyUser) {
                        setNegatedPointId(pointId);
                    } else {
                        login();
                    }
                }}
            />
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 bottom-2 h-7 w-7"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.open(getPointUrl(pointId), '_blank', 'noopener,noreferrer');
                        }}
                        data-action-button="true"
                    >
                        <ExternalLinkIcon className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                    <p>Open in new tab</p>
                </TooltipContent>
            </Tooltip>
        </div>
    );
});

PointCardWrapper.displayName = 'PointCardWrapper';

const POINT_CARD_HEIGHT = 140; // Approximate height of each point card

const VirtualizedPointsList = memo(({ points, selectedPoints, onSelect, isViewMode }: {
    points: number[];
    selectedPoints: Set<number>;
    onSelect: (pointId: number) => void;
    isViewMode: boolean;
}) => {
    const parentRef = useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: points.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => POINT_CARD_HEIGHT + 16,
        overscan: 5
    });

    return (
        <div
            ref={parentRef}
            className="relative overflow-auto"
            style={{ height: "calc(100vh - 300px)" }}
        >
            <div
                style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                }}
            >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                    const pointId = points[virtualRow.index];
                    return (
                        <div
                            key={pointId}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                            className={cn(
                                "border-b last:border-b-0 p-2",
                                !isViewMode && selectedPoints.has(pointId) ? 'bg-purple-500/10 hover:bg-purple-500/20' : 'hover:bg-accent'
                            )}
                            onClick={(e) => {
                                if (isViewMode) return;
                                if (window.getSelection()?.toString() ||
                                    (e.target as HTMLElement).closest('[data-action-button="true"]')) {
                                    return;
                                }
                                onSelect(pointId);
                            }}
                        >
                            <PointCardWrapper
                                pointId={pointId}
                                isSelected={!isViewMode && selectedPoints.has(pointId)}
                                onSelect={() => !isViewMode && onSelect(pointId)}
                                isViewMode={isViewMode}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

VirtualizedPointsList.displayName = 'VirtualizedPointsList';

export const SharePointsDialog: FC<SharePointsDialogProps> = memo(({
    open,
    onOpenChange,
    isViewMode = false,
    sharedBy,
    initialPoints = [],
    ...props
}) => {
    const router = useRouter();
    const [selectedPoints, setSelectedPoints] = useState<Set<number>>(new Set(initialPoints));
    const [searchTerm, setSearchTerm] = useState("");
    // Only use useUser when actually sharing, not in view mode
    const { data: user, isLoading: userLoading } = !isViewMode ? useUser() : { data: null, isLoading: false };

    // Only fetch feed data when in share mode and dialog is open
    const { data: points, isLoading: isLoadingPoints } = useFeed();
    const shouldUseFeed = !isViewMode && open;
    const feedPoints = shouldUseFeed ? points : null;

    // In view mode, load only the shared points
    const sharedPointsQueries = useQueries({
        queries: isViewMode ? initialPoints.map(pointId => ({
            queryKey: ['point', pointId],
            queryFn: () => usePointData(pointId).data,
            enabled: open
        })) : [],
    });

    const isLoadingSharedPoints = isViewMode && sharedPointsQueries.some(query => query.isLoading);

    // Memoize URL generation to prevent unnecessary updates
    const generateShareUrl = useCallback((pointIds: Set<number>) => {
        if (pointIds.size === 0 || isViewMode) return "";
        const url = new URL(window.location.href);
        url.searchParams.set("view", "shared");
        url.searchParams.set("points", Array.from(pointIds).join(","));
        if (user?.username) {
            url.searchParams.set("by", user.username);
        } else if (!userLoading) {
            url.searchParams.set("by", "unknown");
        }
        return url.toString();
    }, [user?.username, userLoading, isViewMode]);

    // Reset state when dialog closes
    useEffect(() => {
        if (!open) {
            setSearchTerm("");
            if (!isViewMode) {
                setSelectedPoints(new Set());
            }
        }
    }, [open, isViewMode]);

    const [urlCopied, setUrlCopied] = useState(false);
    const [shareCopied, setShareCopied] = useState(false);

    const handleCopyLink = useCallback((url: string, type: 'url' | 'share') => {
        if (!url) return;
        navigator.clipboard.writeText(url);
        toast.success("Copied to clipboard");

        if (type === 'url') {
            setUrlCopied(true);
            setTimeout(() => setUrlCopied(false), 1000);
        } else {
            setShareCopied(true);
            setTimeout(() => setShareCopied(false), 1000);
        }
    }, []);

    const filteredPoints = useMemo(() => {
        if (isViewMode) {
            return initialPoints;
        }

        if (!feedPoints || !Array.isArray(feedPoints)) return [];

        if (!searchTerm) return feedPoints.map(point => point.pointId);

        const searchLower = searchTerm.toLowerCase();
        return feedPoints
            .filter(point => point.content?.toLowerCase().includes(searchLower))
            .map(point => point.pointId);
    }, [feedPoints, searchTerm, isViewMode, initialPoints]);

    const handleSelectAll = useCallback(() => {
        setSelectedPoints(new Set(filteredPoints));
    }, [filteredPoints]);

    const handleUnselectAll = useCallback(() => {
        setSelectedPoints(new Set());
    }, []);

    const handlePointSelect = useCallback((pointId: number) => {
        setSelectedPoints(prev => {
            const next = new Set(prev);
            if (next.has(pointId)) {
                next.delete(pointId);
            } else {
                next.add(pointId);
            }
            return next;
        });
    }, []);

    const handleClose = useCallback(() => {
        if (isViewMode) {
            // outer.push to prevent re-renders
            router.push(window.location.pathname, { scroll: false });
        }
        onOpenChange?.(false);
    }, [isViewMode, router, onOpenChange]);

    const isLoading = isViewMode ? isLoadingSharedPoints : (isLoadingPoints && shouldUseFeed);

    const sortedPoints = useMemo(() => {
        if (!filteredPoints) return [];
        if (isViewMode) return filteredPoints;

        const selected = [];
        const unselected = [];
        for (const pointId of filteredPoints) {
            if (selectedPoints.has(pointId)) {
                selected.push(pointId);
            } else {
                unselected.push(pointId);
            }
        }
        return [...selected, ...unselected];
    }, [filteredPoints, selectedPoints, isViewMode]);

    const shareUrl = useMemo(() => {
        return generateShareUrl(selectedPoints);
    }, [generateShareUrl, selectedPoints]);

    // Separate virtualized lists for sender and receiver modes
    const SenderList = (
        <VirtualizedPointsList
            points={sortedPoints}
            selectedPoints={selectedPoints}
            onSelect={handlePointSelect}
            isViewMode={false}
        />
    );

    const ReceiverList = (
        <div className="flex flex-col">
            {sortedPoints.map((pointId) => (
                <div key={pointId} className="border-b last:border-b-0">
                    <PointCardWrapper
                        pointId={pointId}
                        isSelected={false}
                        isViewMode={true}
                    />
                </div>
            ))}
        </div>
    );

    return (
        <Dialog {...props} open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl h-[80vh] flex flex-col gap-0 p-0">
                <div className="flex items-center justify-between p-4 border-b">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleClose}
                        className="h-8 w-8"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                    </Button>
                    <DialogTitle>
                        {isViewMode ? (
                            <>Shared Points {sharedBy ? `by ${sharedBy}` : ""}</>
                        ) : (
                            "Share Points"
                        )}
                    </DialogTitle>
                    <div className="w-8" /> {/* Spacer for centering */}
                </div>

                {/* Only show search and controls in sender mode */}
                {!isViewMode && (
                    <div className="p-4 border-b">
                        <div className="relative flex items-center">
                            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search points..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-9"
                            />
                            {searchTerm && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                                    onClick={() => setSearchTerm("")}
                                >
                                    <XIcon className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                        <div className="flex justify-between mt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={handleSelectAll}
                            >
                                Select All
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={handleUnselectAll}
                            >
                                Unselect All
                            </Button>
                        </div>
                    </div>
                )}

                {isLoading ? (
                    <div className="flex-1 p-4">
                        <div className="space-y-2">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-[120px] w-full" />
                            ))}
                        </div>
                    </div>
                ) : filteredPoints?.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center p-4">
                        <p className="text-muted-foreground">
                            {searchTerm
                                ? "No points found matching your search"
                                : "No points available"}
                        </p>
                    </div>
                ) : (
                    // Use different lists for sender and receiver modes
                    isViewMode ? ReceiverList : SenderList
                )}

                {/* Only show share controls in sender mode */}
                {!isViewMode && (
                    <div className="p-4 border-t space-y-3">
                        {selectedPoints.size > 0 && (
                            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm">
                                <div className="truncate flex-1">
                                    {shareUrl}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "h-8 w-8 shrink-0 transition-colors duration-200",
                                        urlCopied && "text-green-500"
                                    )}
                                    onClick={() => handleCopyLink(shareUrl, 'url')}
                                >
                                    {urlCopied ? (
                                        <CheckIcon className="h-4 w-4" />
                                    ) : (
                                        <CopyIcon className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        )}
                        <Button
                            className="w-full relative"
                            disabled={selectedPoints.size === 0}
                            onClick={() => {
                                handleCopyLink(shareUrl, 'share');
                            }}
                        >
                            <span className={cn(
                                "absolute inset-0 flex items-center justify-center transition-opacity duration-200",
                                shareCopied ? "opacity-100" : "opacity-0"
                            )}>
                                <CheckIcon className="h-4 w-4 mr-2" />
                                Copied!
                            </span>
                            <span className={cn(
                                "flex items-center justify-center transition-opacity duration-200",
                                shareCopied ? "opacity-0" : "opacity-100"
                            )}>
                                Share {selectedPoints.size > 0 ? `(${selectedPoints.size})` : ""}
                            </span>
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
});

SharePointsDialog.displayName = 'SharePointsDialog'; 