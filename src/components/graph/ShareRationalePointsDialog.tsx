import { useRouter } from "next/navigation";
import { FC, useCallback, useMemo, useState, useEffect, memo, useRef } from "react";
import { Portal } from "@radix-ui/react-portal";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { usePrivy } from "@privy-io/react-auth";
import { usePointData, PointData } from "@/queries/usePointData";
import { PointCard } from "../PointCard";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { ArrowLeftIcon, SearchIcon, XIcon, CheckIcon, CopyIcon, ExternalLinkIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { DialogProps } from "@radix-ui/react-dialog";
import { useViewpoint } from "@/queries/useViewpoint";
import { useSetAtom } from "jotai";
import { negatedPointIdAtom } from "@/atoms/negatedPointIdAtom";
import { Skeleton } from "../ui/skeleton";
import { toast } from "sonner";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useUser } from "@/queries/useUser";
import { PointNode } from "@/components/graph/PointNode";
import { getPointUrl } from "@/lib/getPointUrl";
import { useQuery } from "@tanstack/react-query";
import { pointFetcher } from "@/queries/usePointData";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";

interface ShareRationaleDialogProps extends DialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isViewMode?: boolean;
    sharedBy?: string;
    rationaleId: string | undefined;
    spaceId: string;
    initialPoints?: number[];
}

interface PointCardWrapperProps {
    pointId: number;
    isSelected: boolean;
    onSelect?: () => void;
    isViewMode?: boolean;
    rationaleId: string | undefined;
    spaceId: string;
}

const MemoizedPointCard = memo(PointCard);

const PointCardWrapper: FC<PointCardWrapperProps> = memo(({ pointId, isSelected, onSelect, isViewMode, rationaleId, spaceId }) => {
    const { data: pointData, isLoading } = usePointData(pointId);
    const { login, user: privyUser } = usePrivy();
    const setNegatedPointId = useSetAtom(negatedPointIdAtom);

    const anyPointData = pointData as any;

    if (isLoading || !anyPointData || typeof anyPointData.pointId !== 'number') {
        return (
            <div className="w-full h-24 bg-muted animate-pulse rounded-md" />
        );
    }

    return (
        <div className={cn(
            "relative h-full",
            !isViewMode && !isSelected && "opacity-50 transition-opacity duration-200",
            "hover:bg-accent transition-colors duration-200"
        )}>
            {!isViewMode && (
                <CheckboxPrimitive.Root
                    checked={isSelected}
                    onCheckedChange={onSelect}
                    className="absolute top-4 right-4 z-10 h-5 w-5 rounded-sm border border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                    aria-label={`Select point ${pointId}`}
                >
                    <CheckboxPrimitive.Indicator className={cn("flex items-center justify-center text-current")}>
                        <CheckIcon className="h-4 w-4" />
                    </CheckboxPrimitive.Indicator>
                </CheckboxPrimitive.Root>
            )}
            <MemoizedPointCard
                className="flex-grow p-4"
                favor={anyPointData.favor}
                content={anyPointData.content}
                createdAt={anyPointData.createdAt}
                amountSupporters={anyPointData.amountSupporters}
                amountNegations={anyPointData.amountNegations}
                pointId={anyPointData.pointId}
                cred={anyPointData.cred}
                viewerContext={{ viewerCred: anyPointData.viewerCred }}
                linkDisabled={true}
                disablePopover={true}
                disableVisitedMarker={true}
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
                            window.open(getPointUrl(pointId, spaceId || 'global'), '_blank', 'noopener,noreferrer');
                        }}
                        data-action-button="true"
                    >
                        <ExternalLinkIcon className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                    <p>Open point in new tab</p>
                </TooltipContent>
            </Tooltip>
        </div>
    );
});

PointCardWrapper.displayName = 'PointCardWrapper';

const POINT_CARD_HEIGHT = 140;

const VirtualizedPointsList = memo(({ points, selectedPoints, onSelect, isViewMode, rationaleId, spaceId }: {
    points: number[];
    selectedPoints: Set<number>;
    onSelect: (pointId: number) => void;
    isViewMode: boolean;
    rationaleId: string | undefined;
    spaceId: string;
}) => {
    const parentRef = useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: points.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => POINT_CARD_HEIGHT + 48,
        overscan: 5
    });

    return (
        <div
            ref={parentRef}
            className="relative pb-8"
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
                                "border-b last:border-b-0 p-2 transition-colors duration-200",
                            )}
                        >
                            <PointCardWrapper
                                pointId={pointId}
                                isSelected={!isViewMode && selectedPoints.has(pointId)}
                                onSelect={() => !isViewMode && onSelect(pointId)}
                                isViewMode={isViewMode}
                                rationaleId={rationaleId}
                                spaceId={spaceId}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

VirtualizedPointsList.displayName = 'VirtualizedPointsList';

export const ShareRationaleDialog: FC<ShareRationaleDialogProps> = memo(({
    open,
    onOpenChange,
    isViewMode = false,
    sharedBy,
    rationaleId,
    spaceId,
    initialPoints = [],
}) => {
    const router = useRouter();
    const [selectedPoints, setSelectedPoints] = useState<Set<number>>(new Set());
    const [searchTerm, setSearchTerm] = useState("");
    const { data: user, isLoading: userLoading } = useUser();
    const { data: viewpoint } = useViewpoint(rationaleId!, {
        enabled: !!rationaleId
    });

    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [modalSize, setModalSize] = useState({ width: 480, height: 650 });
    const [isMobile, setIsMobile] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });

    const pointsSource = useMemo(() => {
        if (isViewMode) {
            return initialPoints;
        }
        if (!viewpoint?.graph?.nodes) return [];
        const uniquePointIds = new Set<number>();
        const nodes = viewpoint.graph.nodes as any[];
        for (const node of nodes) {
            if (node && node.type === 'point') {
                const pointNode = node as PointNode;
                if (typeof pointNode.data?.pointId === 'number') {
                    uniquePointIds.add(pointNode.data.pointId);
                }
            }
        }
        return Array.from(uniquePointIds);
    }, [viewpoint, isViewMode, initialPoints]);

    const { data: pointsData, isLoading: isPointsLoading } = useQuery<Map<number, PointData>>({
        queryKey: ['pointsData', pointsSource, isViewMode],
        queryFn: async () => {
            if (isViewMode || !pointsSource.length) return new Map<number, PointData>();
            const results = await Promise.all(
                pointsSource.map(async (pointId) => {
                    const fetchedPoint = await pointFetcher.fetch(pointId);
                    return fetchedPoint && typeof fetchedPoint.pointId === 'number'
                        ? [pointId, fetchedPoint as PointData] as const
                        : null;
                })
            );
            return new Map<number, PointData>(results.filter((r): r is [number, PointData] => r !== null));
        },
        enabled: !isViewMode && pointsSource.length > 0,
        staleTime: 5 * 60 * 1000,
    });

    const pointDataMap = useMemo(() => {
        return pointsData || new Map<number, PointData>();
    }, [pointsData]);

    const isLoading = (isViewMode ? false : !viewpoint || isPointsLoading) || userLoading;

    const generateShareUrl = useCallback((pointIds: Set<number>) => {
        if (pointIds.size === 0 || isViewMode || !rationaleId) return "";
        const url = new URL(`${window.location.origin}/s/${spaceId || 'global'}/rationale/${rationaleId}`);
        url.searchParams.set("view", "shared");
        url.searchParams.set("points", Array.from(pointIds).join(","));
        if (user?.username) {
            url.searchParams.set("by", user.username);
        } else if (!userLoading) {
            url.searchParams.set("by", "unknown");
        }
        return url.toString();
    }, [user?.username, userLoading, isViewMode, rationaleId, spaceId]);

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
        const lowerSearchTerm = searchTerm.toLowerCase().trim();

        if (isViewMode) {
            return pointsSource;
        }
        if (!pointsSource || !Array.isArray(pointsSource)) {
            return [];
        }
        if (!lowerSearchTerm) {
            return pointsSource;
        }
        if (isPointsLoading) {
            return pointsSource;
        }

        return pointsSource.filter(pointId => {
            const pointData = pointDataMap.get(pointId);
            const anyPointData = pointData as any;
            if (!anyPointData || !anyPointData.content) {
                return false;
            }
            return anyPointData.content.toLowerCase().includes(lowerSearchTerm);
        });
    }, [pointsSource, searchTerm, isViewMode, isPointsLoading, pointDataMap]);

    const handleSelectAll = useCallback(() => {
        if (!isViewMode) {
            setSelectedPoints(new Set(filteredPoints));
        }
    }, [filteredPoints, isViewMode]);

    const handleUnselectAll = useCallback(() => {
        if (!isViewMode) {
            setSelectedPoints(new Set());
        }
    }, [isViewMode]);

    const handlePointSelect = useCallback((pointId: number) => {
        if (!isViewMode) {
            setSelectedPoints(prev => {
                const next = new Set(prev);
                if (next.has(pointId)) {
                    // eslint-disable-next-line drizzle/enforce-delete-with-where
                    next.delete(pointId);
                } else {
                    next.add(pointId);
                }
                return next;
            });
        }
    }, [isViewMode]);

    const handleClose = useCallback(() => {
        if (isViewMode) {
            const url = new URL(window.location.href);
            // eslint-disable-next-line drizzle/enforce-delete-with-where
            url.searchParams.delete('view');
            // eslint-disable-next-line drizzle/enforce-delete-with-where
            url.searchParams.delete('points');
            // eslint-disable-next-line drizzle/enforce-delete-with-where
            url.searchParams.delete('by');
            router.push(url.pathname + url.search, { scroll: false });
        }
        onOpenChange?.(false);
        setSearchTerm('');
        if (!isViewMode) {
            setSelectedPoints(new Set());
        }
    }, [isViewMode, router, onOpenChange]);

    const sortedPoints = useMemo(() => {
        if (!filteredPoints) return [];
        if (isViewMode) return filteredPoints;
        return filteredPoints;
    }, [filteredPoints, isViewMode]);

    const shareUrl = useMemo(() => {
        return generateShareUrl(selectedPoints);
    }, [generateShareUrl, selectedPoints]);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => {
            window.removeEventListener('resize', checkMobile);
        };
    }, []);

    useEffect(() => {
        if (!open) return;

        if (isMobile) {
            const dialogWidth = Math.min(window.innerWidth - 50, 330);
            const dialogHeight = Math.min(window.innerHeight * 0.6, 450);

            setModalSize({ width: dialogWidth, height: dialogHeight });
            setPosition({
                x: (window.innerWidth - dialogWidth) / 2,
                y: 60
            });
        } else {
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const dialogWidth = Math.min(480, viewportWidth - 40);
            const dialogHeight = modalSize.height;

            setModalSize(prev => ({ ...prev, width: dialogWidth }));

            const rightPadding = 20;
            const bottomPadding = 20;
            const xPos = viewportWidth - dialogWidth - rightPadding;
            const yPos = viewportHeight - dialogHeight - bottomPadding;

            setPosition({
                x: Math.max(20, xPos),
                y: Math.max(20, yPos)
            });
        }
    }, [open, isMobile, modalSize.height]);

    useEffect(() => {
        if (open && !isMobile && modalRef.current) {
            const newWidth = Math.min(480, window.innerWidth - 40);
            setModalSize(prev => ({ ...prev, width: newWidth }));
        }
    }, [open, isMobile]);

    useEffect(() => {
        if (!open) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging.current) {
                const newX = e.clientX - dragStart.current.x;
                const newY = e.clientY - dragStart.current.y;
                const maxX = window.innerWidth - (modalRef.current?.offsetWidth || modalSize.width);
                const maxY = window.innerHeight - (modalRef.current?.offsetHeight || modalSize.height);
                setPosition({
                    x: Math.max(0, Math.min(newX, maxX)),
                    y: Math.max(0, Math.min(newY, maxY))
                });
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (isDragging.current && e.touches.length === 1) {
                const newX = e.touches[0].clientX - dragStart.current.x;
                const newY = e.touches[0].clientY - dragStart.current.y;
                const maxX = window.innerWidth - (modalRef.current?.offsetWidth || modalSize.width);
                const maxY = window.innerHeight - (modalRef.current?.offsetHeight || modalSize.height);
                setPosition({
                    x: Math.max(0, Math.min(newX, maxX)),
                    y: Math.max(0, Math.min(newY, maxY))
                });
            }
        };

        const handleMouseUp = () => {
            isDragging.current = false;
        };

        const handleTouchEnd = () => {
            isDragging.current = false;
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [open, modalRef, modalSize.width, modalSize.height]);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('.modal-header')) {
            if (!(e.target as HTMLElement).closest('button')) {
                isDragging.current = true;
                dragStart.current = {
                    x: e.clientX - position.x,
                    y: e.clientY - position.y
                };
                e.preventDefault();
            }
        }
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('.modal-header')) {
            if (!(e.target as HTMLElement).closest('button') && e.touches.length === 1) {
                isDragging.current = true;
                dragStart.current = {
                    x: e.touches[0].clientX - position.x,
                    y: e.touches[0].clientY - position.y
                };
            }
        }
    };

    const PointsList = (
        <VirtualizedPointsList
            points={sortedPoints}
            selectedPoints={selectedPoints}
            onSelect={handlePointSelect}
            isViewMode={isViewMode}
            rationaleId={rationaleId}
            spaceId={spaceId}
        />
    );

    if (!open) return null;

    return (
        <Portal>
            <div
                ref={modalRef}
                className={cn(
                    "fixed z-50 bg-background rounded-lg border-2 shadow-lg overflow-hidden flex flex-col",
                )}
                style={{
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    width: `${modalSize.width}px`,
                    height: `${modalSize.height}px`,
                }}
            >
                <div
                    className="modal-header flex items-center justify-between p-4 border-b cursor-move"
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                >
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleClose}
                        className="h-8 w-8"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                    </Button>
                    <h3 className="font-medium text-lg text-center">
                        {isViewMode ? (
                            sharedBy ? `${sharedBy} thought you'd like these points` : "Someone thought you'd like these points"
                        ) : (
                            "Share Rationale Points"
                        )}
                    </h3>
                    <div className="w-8" />
                </div>

                {!isViewMode && (
                    <div className="p-4 border-b">
                        <div className="relative flex items-center">
                            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search points..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-9"
                                disabled={isPointsLoading}
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
                        {isPointsLoading && <p className="text-xs text-muted-foreground mt-1 text-center">Loading points for search...</p>}
                        <div className="flex justify-between mt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={handleSelectAll}
                                disabled={isPointsLoading}
                            >
                                Select All
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={handleUnselectAll}
                                disabled={isPointsLoading}
                            >
                                Unselect All
                            </Button>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-auto">
                    {isLoading && !isPointsLoading ? (
                        <div className="p-4 space-y-2">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-[120px] w-full" />
                            ))}
                        </div>
                    ) : sortedPoints.length === 0 && !isPointsLoading ? (
                        <div className="flex h-full items-center justify-center p-4">
                            <p className="text-muted-foreground">
                                {isViewMode
                                    ? "No points were shared."
                                    : searchTerm
                                        ? "No points found matching your search"
                                        : "No points available in this rationale"
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="relative">
                            {PointsList}
                        </div>
                    )}
                </div>

                {!isViewMode && (
                    <div className="p-4 border-t space-y-3 bg-background">
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
            </div>
        </Portal>
    );
});

ShareRationaleDialog.displayName = 'ShareRationaleDialog';
