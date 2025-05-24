import { useRouter } from "next/navigation";
import { FC, useCallback, useMemo, useState, useEffect, memo, useRef } from "react";
import { Portal } from "@radix-ui/react-portal";
import { Button } from "@/components/ui/button";
import { usePrivy } from "@privy-io/react-auth";
import { usePointData, PointData } from "@/queries/points/usePointData";
import { PointCard } from "@/components/cards/PointCard";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeftIcon, ExternalLinkIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { DialogProps } from "@radix-ui/react-dialog";
import { useSetAtom } from "jotai";
import { negatedPointIdAtom } from "@/atoms/negatedPointIdAtom";
import { Skeleton } from "@/components/ui/skeleton";
import { useVirtualizer } from "@tanstack/react-virtual";
import { getPointUrl } from "@/lib/negation-game/getPointUrl";
import { useQuery } from "@tanstack/react-query";
import { pointFetcher } from "@/queries/points/usePointData";

export interface ShareRationaleDialogProps extends DialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sharedBy?: string;
    rationaleId: string | undefined;
    spaceId: string;
    initialPoints?: number[];
}

interface PointCardWrapperProps {
    pointId: number;
    rationaleId: string | undefined;
    spaceId: string;
}

const MemoizedPointCard = memo(PointCard);

const PointCardWrapper: FC<PointCardWrapperProps> = memo(({ pointId, rationaleId, spaceId }) => {
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
        <div className="relative h-full">
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

const VirtualizedPointsList = memo(({ points, rationaleId, spaceId }: {
    points: number[];
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
            className="relative pb-8 h-full overflow-y-auto"
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
    sharedBy,
    rationaleId,
    spaceId,
    initialPoints = [],
}) => {

    const router = useRouter();
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [modalSize, setModalSize] = useState({ width: 480, height: 650 });
    const [isMobile, setIsMobile] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });

    const { data: pointsData, isLoading: isPointsLoading } = useQuery<Map<number, PointData>>({
        queryKey: ['pointsData', initialPoints],
        queryFn: async () => {
            if (!initialPoints.length) return new Map<number, PointData>();
            const results = await Promise.all(
                initialPoints.map(async (pointId) => {
                    const fetchedPoint = await pointFetcher.fetch(pointId);
                    return fetchedPoint && typeof fetchedPoint.pointId === 'number'
                        ? [pointId, fetchedPoint as PointData] as const
                        : null;
                })
            );
            return new Map<number, PointData>(results.filter((r): r is [number, PointData] => r !== null));
        },
        enabled: initialPoints.length > 0,
        staleTime: 5 * 60 * 1000,
    });

    const handleClose = useCallback(() => {
        const url = new URL(window.location.href);
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        url.searchParams.delete('view');
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        url.searchParams.delete('points');
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        url.searchParams.delete('by');
        router.push(url.pathname + url.search, { scroll: false });
        onOpenChange?.(false);
    }, [router, onOpenChange]);

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
            points={initialPoints}
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
                        {sharedBy ? `${sharedBy} thought you'd like these points` : "Someone thought you'd like these points"}
                    </h3>
                    <div className="w-8" />
                </div>

                {initialPoints.length === 0 && !isPointsLoading && (
                    <div className="flex h-full items-center justify-center p-4">
                        <p className="text-muted-foreground">
                            No points were shared.
                        </p>
                    </div>
                )}

                <div className="flex-1 overflow-auto">
                    {isPointsLoading ? (
                        <div className="p-4 space-y-2">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-[120px] w-full" />
                            ))}
                        </div>
                    ) : initialPoints.length > 0 ? (
                        <div className="relative h-full">
                            {PointsList}
                        </div>
                    ) : null}
                </div>
            </div>
        </Portal>
    );
});

ShareRationaleDialog.displayName = 'ShareRationaleDialog';
