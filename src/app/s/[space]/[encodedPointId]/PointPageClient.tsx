"use client";

import { format } from "date-fns";
import { useMemo, useState, useEffect, memo } from "react";
import Link from "next/link";
import React from "react";

import { canvasEnabledAtom } from "@/atoms/canvasEnabledAtom";
import { hoveredPointIdAtom } from "@/atoms/hoveredPointIdAtom";
import { negatedPointIdAtom } from "@/atoms/negatedPointIdAtom";
import { negationContentAtom } from "@/atoms/negationContentAtom";
import { CredInput } from "@/components/inputs/CredInput";
import { PointCard } from "@/components/cards/PointCard";
import { PointStats } from "@/components/cards/pointcard/PointStats";
import { RestakeDialog } from "@/components/dialogs/RestakeDialog";
import { SelectNegationDialog } from "@/components/dialogs/SelectNegationDialog";
import { PointEditDialog } from "@/components/dialogs/PointEditDialog";
import { fetchPointHistory } from "@/actions/points/fetchPointHistory";
import { GraphView } from "@/components/graph/base/GraphView";
import { EndorseButton } from "@/components/buttons/EndorseButton";
import { NegateButton } from "@/components/buttons/NegateButton";
import { NegateIcon } from "@/components/icons/NegateIcon";
import { TrashIcon } from "@/components/icons/TrashIcon";
import { EditIcon, HistoryIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DEFAULT_TIMESCALE } from "@/constants/config";
import { useBasePath } from "@/hooks/utils/useBasePath";
import { useCredInput } from "@/hooks/ui/useCredInput";
import { useVisitedPoints } from "@/hooks/points/useVisitedPoints";
import { cn } from "@/lib/utils/cn";
import { decodeId } from "@/lib/negation-game/decodeId";
import { encodeId } from "@/lib/negation-game/encodeId";
import { preventDefaultIfContainsSelection } from "@/lib/utils/preventDefaultIfContainsSelection";
import { TimelineScale, timelineScales } from "@/lib/negation-game/timelineScale";
import { useEndorse } from "@/mutations/endorsements/useEndorse";
import { useFavorHistory } from "@/queries/epistemic/useFavorHistory";
import { usePrefetchPoint } from "@/queries/points/usePointData";
import { usePointNegations } from "@/queries/points/usePointNegations";
import { useSpace } from "@/queries/space/useSpace";
import { useUser } from "@/queries/users/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { AvatarImage } from "@radix-ui/react-avatar";
import { useToggle } from "@uidotdev/usehooks";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ReactFlowProvider, useNodesState, useEdgesState } from "@xyflow/react";
import type { ReactFlowInstance } from '@xyflow/react';
import type { NodeChange, EdgeChange, Edge } from '@xyflow/react';
import { useAtom, useSetAtom } from "jotai";
import { useAtomCallback } from "jotai/utils";
import {
    ArrowLeftIcon,
    CircleXIcon,
    NetworkIcon,
    Repeat2Icon,
    SparklesIcon,
    MoreVertical,
    ClipboardCopyIcon,
} from "lucide-react";
import { nanoid } from "nanoid";
import { notFound, useRouter, useSearchParams, usePathname } from "next/navigation";
import { Fragment, useCallback } from "react";
import {
    Dot,
    Line,
    LineChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { usePointData, pointQueryKey } from "@/queries/points/usePointData";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { usePrefetchRestakeData } from "@/hooks/epistemic/usePrefetchRestakeData";
import { visitedPointsAtom } from "@/atoms/visitedPointsAtom";
import { DeletePointDialog } from "@/components/dialogs/DeletePointDialog";
import { isWithinDeletionTimelock } from "@/lib/negation-game/deleteTimelock";
import { getPointUrl } from "@/lib/negation-game/getPointUrl";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { getBackButtonHandler } from "@/lib/negation-game/backButtonUtils";
import { initialSpaceTabAtom } from "@/atoms/navigationAtom";
import { useSellEndorsement } from "@/mutations/endorsements/useSellEndorsement";
import { AuthenticatedActionButton } from "@/components/editor/AuthenticatedActionButton";
import { toast } from "sonner";
import { ObjectionHeader } from '@/components/cards/pointcard/ObjectionHeader';
import { DeltaComparisonWidget } from '@/components/delta/DeltaComparisonWidget';

type Point = {
    id: number;
    pointId: number;
    content: string;
    createdAt: Date;
    cred: number;
    stakedAmount: number;
    viewerCred?: number;
    amountSupporters: number;
    amountNegations: number;
    negationsCred: number;
    isCommand?: boolean;
    isPinned?: boolean;
    pinnedByCommandId?: number | null;
    createdBy?: string;
    isObjection?: boolean;
    objectionTargetId?: number;
};

type PageProps = {
    params: { encodedPointId: string; space: string };
    searchParams: { [key: string]: string | string[] | undefined };
};
import { useCounterpointSuggestions } from "@/queries/ai/useCounterpointSuggestions";
import { useGraphPoints } from '@/hooks/graph/useGraphPoints';
import { GraphSizingContext } from '@/components/graph/base/GraphSizingContext';
import { fetchPoints } from '@/actions/points/fetchPoints';
import type { PointData } from '@/queries/points/usePointData';
import type { AppNode } from '@/components/graph/nodes/AppNode';
import { useCollapseUndo } from '@/hooks/graph/useCollapseUndo';
import { useChunkedPrefetchPoints } from '@/hooks/graph/useChunkedPrefetchPoints';
import { useFilteredEdges } from '@/hooks/graph/useFilteredEdges';
import { useGraphInitialization } from '@/hooks/graph/useGraphInitialization';

const NegationCard = memo(({ negation, viewParam, basePath, privyUser, login, handleNegate, point, prefetchRestakeData, setRestakePoint, handleNegationHover, handleNegationHoverEnd, prefetchPoint, loadingCardId, onCardClick }: any) => {
    const [favorHistoryLoaded, setFavorHistoryLoaded] = useState(false);
    const favorHistoryKey = useMemo(() => [negation.pointId, "favor-history", "1W"], [negation.pointId]);
    const queryClient = useQueryClient();

    const handleHover = useCallback(() => {
        handleNegationHover(negation.pointId);

        if (!favorHistoryLoaded) {
            import("@/actions/feed/fetchFavorHistory")
                .then(({ fetchFavorHistory }) => {
                    fetchFavorHistory({
                        pointId: negation.pointId,
                        scale: "1W"
                    })
                        .then(data => {
                            if (data) {
                                queryClient.setQueryData(favorHistoryKey, data);
                                setFavorHistoryLoaded(true);
                            }
                        })
                        .catch(error => {
                            console.warn(`[NegationCard] Failed to fetch favor history on hover for ${negation.pointId}:`, error);
                        });
                });
        }
    }, [negation.pointId, handleNegationHover, favorHistoryLoaded, queryClient, favorHistoryKey]);

    return (
        <div className="relative">
            <Link
                data-show-hover={false}
                draggable={false}
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                    const isActionButton = (e.target as HTMLElement).closest('[data-action-button="true"]');
                    preventDefaultIfContainsSelection(e);
                    if (!isActionButton && window.getSelection()?.isCollapsed !== false) {
                        prefetchPoint(negation.pointId);
                        onCardClick(`point-${negation.pointId}`);
                    }
                }}
                href={`${basePath}/${encodeId(negation.pointId)}${viewParam ? `?view=${viewParam}` : ""}`}
                key={negation.pointId}
                className="flex border-b cursor-pointer hover:bg-accent"
                onMouseEnter={handleHover}
                onMouseLeave={handleNegationHoverEnd}
            >
                <PointCard
                    onNegate={(e) => {
                        e.preventDefault();
                        if (privyUser === null) {
                            login();
                            return;
                        }
                        handleNegate(negation.pointId);
                    }}
                    className="flex-grow p-6"
                    favor={negation.favor}
                    content={negation.content}
                    createdAt={negation.createdAt}
                    amountSupporters={negation.amountSupporters}
                    amountNegations={negation.amountNegations}
                    pointId={negation.pointId}
                    cred={negation.cred}
                    viewerContext={{ viewerCred: negation.viewerCred }}
                    isNegation={true}
                    isObjection={negation.isObjection}
                    objectionTargetId={negation.objectionTargetId}
                    parentPoint={{
                        ...point,
                        id: point.pointId,
                        stakedAmount: point.cred,
                    }}
                    negationId={point.pointId}
                    onRestake={({ openedFromSlashedIcon }) => {
                        if (privyUser === null) {
                            login();
                            return;
                        }
                        setRestakePoint({
                            point: {
                                ...point,
                                stakedAmount: point.cred,
                                pointId: point.pointId,
                                id: point.pointId,
                            },
                            counterPoint: {
                                ...negation,
                                stakedAmount: negation.cred,
                                pointId: negation.pointId,
                                id: negation.pointId,
                            },
                            openedFromSlashedIcon,
                        });
                    }}
                    restake={negation.restake}
                    doubt={negation.doubt}
                    totalRestakeAmount={negation.totalRestakeAmount}
                    isInPointPage={true}
                    isLoading={loadingCardId === `point-${negation.pointId}`}
                />
            </Link>
        </div>
    );
});
NegationCard.displayName = 'NegationCard';

export function PointPageClient({
    params,
    searchParams: initialSearchParams,
}: PageProps) {
    const { user: privyUser, login, ready } = usePrivy();
    const { encodedPointId, space } = params;
    const decodedPointId = decodeId(encodedPointId);
    // Ensure we have a valid number for pointId, fallback to -1 for invalid IDs
    const pointId = typeof decodedPointId === 'number' ? decodedPointId : -1;
    const setNegatedPointId = useSetAtom(negatedPointIdAtom);
    const queryClient = useQueryClient();
    const router = useRouter();

    const setNegationContent = useAtomCallback(
        (_get, set, negatedPointId: number, content: string) => {
            set(negationContentAtom(negatedPointId), content);
        }
    );
    const basePath = useBasePath();
    const spaceData = useSpace(space);
    const [canvasEnabled, setCanvasEnabled] = useAtom(canvasEnabledAtom);
    const {
        data: point,
        refetch: refetchPoint,
        isLoading: isLoadingPoint,
        isError: isPointError
    } = usePointData(pointId);
    const [timelineScale, setTimelineScale] = useState<TimelineScale>(DEFAULT_TIMESCALE);

    useEffect(() => {
        if (!isLoadingPoint && !point && isPointError) {
            console.warn(`Point not found: ${pointId}`);
            router.push('/not-found');
            return;
        }
    }, [point, isLoadingPoint, isPointError, pointId, router]);

    const {
        data: favorHistory,
        refetch: refetchFavorHistory,
        isFetching: isFetchingFavorHistory,
    } = useFavorHistory({ pointId, timelineScale });

    const {
        data: negations = [],
        isLoading: isLoadingNegations,
        refetch: refetchNegations,
    } = usePointNegations(pointId);
    const [hoveredPointId, setHoveredPointId] = useAtom(hoveredPointIdAtom);
    const { data: user } = useUser();
    const [endorsePopoverOpen, toggleEndorsePopoverOpen] = useToggle(false);
    const {
        credInput: cred,
        setCredInput: setCred,
        notEnoughCred,
    } = useCredInput({
        resetWhen: !endorsePopoverOpen,
    });
    const { back, push } = router;
    const searchParams = useSearchParams();
    const viewParam = searchParams?.get("view");
    const counterpointSuggestions = useCounterpointSuggestions(point?.pointId);
    const [selectNegationDialogOpen, toggleSelectNegationDialog] = useToggle(false);
    const [restakePoint, setRestakePoint] = useState<{
        point: Point;
        counterPoint: Point;
        openedFromSlashedIcon?: boolean;
    } | null>(null);
    const prefetchPoint = usePrefetchPoint();
    const prefetchRestakeData = usePrefetchRestakeData();
    const { markPointAsRead } = useVisitedPoints();
    const pathname = usePathname();
    const { mutate: endorse, isPending: isEndorsing } = useEndorse();
    const { mutate: sellEndorsement, isPending: isSellingEndorsement } = useSellEndorsement();
    const [_, setVisitedPoints] = useAtom(visitedPointsAtom);
    const [recentlyNegated, setRecentlyNegated] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [forceShowNegations, setForceShowNegations] = useState(false);
    const [negationsLoadStartTime] = useState(() => Date.now());
    const [loadingCardId, setLoadingCardId] = useState<string | null>(null);
    const setInitialTab = useSetAtom(initialSpaceTabAtom);
    const backButtonHandler = getBackButtonHandler(router, setInitialTab);
    const [isSelling, setIsSelling] = useState(false);

    // Load additional data after point data is loaded
    useEffect(() => {
        if (point && !isLoadingPoint && !isPointError) {
            // Load essential data only - combine queries to reduce network load
            const fetchData = async () => {
                try {
                    // Use Promise.all to parallelize these essential requests
                    const [negationsModule, favorHistoryModule] = await Promise.all([
                        import("@/actions/points/fetchPointNegations"),
                        import("@/actions/feed/fetchFavorHistory")
                    ]);

                    // Then run the actual data fetches in parallel
                    const [negationsData, favorHistoryData] = await Promise.all([
                        negationsModule.fetchPointNegations(pointId),
                        favorHistoryModule.fetchFavorHistory({
                            pointId,
                            scale: "1W"
                        })
                    ]);
                    queryClient.setQueryData(["point-negations", pointId, privyUser?.id], negationsData);
                    queryClient.setQueryData([pointId, "favor-history", "1W"], favorHistoryData);
                } catch (error) {
                    console.error("[PointPageClient] Error prefetching essential data:", error);
                }
            };

            fetchData();
        }
    }, [point, pointId, queryClient, privyUser?.id, isLoadingPoint, isPointError]);

    // Force show negations after 2.5 seconds to avoid stalled UI
    useEffect(() => {
        if ((isLoadingNegations || !negations) && !forceShowNegations) {
            const timerId = setTimeout(() => {
                setForceShowNegations(true);
            }, 2000);

            return () => {
                clearTimeout(timerId);
            };
        }
    }, [isLoadingNegations, forceShowNegations, negationsLoadStartTime, pointId, negations]);

    const initialNodes = useMemo(
        () => [
            {
                id: nanoid(),
                position: { x: 100, y: 100 },
                type: "point" as const,
                data: { pointId, expandOnInit: true },
            },
        ],
        [pointId]
    );

    useEffect(() => {
        if (!isLoadingPoint && point === null && !isRedirecting) {
            // Redirect to space root
            if (window.location.pathname.includes("/s/")) {
                // Get current space from pathname
                const spaceMatch = pathname?.match(/^\/s\/([^\/]+)/);
                const redirectUrl = spaceMatch && spaceMatch[1]
                    ? `/s/${spaceMatch[1]}`
                    : "/";

                setIsRedirecting(true);

                window.location.href = redirectUrl;
            } else {
                setIsRedirecting(true);
            }
        }
    }, [point, isLoadingPoint, pathname, isRedirecting]);

    useEffect(() => {
        if (pointId) {
            markPointAsRead(pointId);
            setVisitedPoints(prev => {
                const newSet = new Set(prev);
                newSet.add(pointId);
                return newSet;
            });
        }
    }, [pointId, markPointAsRead, setVisitedPoints]);

    useEffect(() => {
        setCanvasEnabled(searchParams?.get("view") === "graph");
    }, [searchParams, setCanvasEnabled]);

    useEffect(() => {
        // Mark the point data as fresh when this component mounts
        // This prevents unnecessary refetches when navigating back from feed
        if (privyUser?.id) {
            queryClient.setQueryData(
                pointQueryKey({ pointId, userId: privyUser?.id }),
                (oldData: any) => oldData
            );
        }
    }, [queryClient, privyUser?.id, pointId]);

    useEffect(() => {
        if (!Array.isArray(negations) || negations.length === 0) return;

        // Only prefetch first-level negations basic data
        negations.forEach((negation: any) => {
            if (negation.pointId !== pointId) {
                prefetchPoint(negation.pointId);
            }
        });
    }, [negations, pointId, prefetchPoint]);

    useEffect(() => {
        const handleNegationCreated = () => {
            // Invalidate the negations cache to force a refresh
            if (pointId) {
                queryClient.invalidateQueries({
                    queryKey: [pointId, "negations"],
                    exact: false,
                });

                // Also invalidate the point data which includes negation count
                queryClient.invalidateQueries({
                    queryKey: pointQueryKey({ pointId, userId: user?.id }),
                    exact: true,
                });
            }

            setRecentlyNegated(true);

            setTimeout(() => {
                setRecentlyNegated(false);
            }, 2000);
        };

        window.addEventListener("negation-created", handleNegationCreated);
        return () => window.removeEventListener("negation-created", handleNegationCreated);
    }, [pointId, queryClient, user?.id]);

    const isInSpecificSpace = pathname?.includes('/s/') && !pathname.match(/^\/s\/global\//);
    const isGlobalSpace = spaceData.data?.id === 'global' || spaceData.data?.id === 'global/';
    const endorsedByViewer = point?.viewerCred !== undefined && point.viewerCred > 0;

    const handleEndorseOrSell = useCallback(() => {
        if (!point?.pointId) return;
        if (privyUser === null) {
            login();
            return;
        }

        if (isSelling) {
            sellEndorsement({ pointId: point.pointId, amountToSell: cred });
        } else {
            endorse({ pointId: point.pointId, cred });
        }
        toggleEndorsePopoverOpen(false);
    }, [isSelling, point?.pointId, cred, privyUser, login, sellEndorsement, endorse, toggleEndorsePopoverOpen]);

    const handleEndorse = useCallback(() => {
        if (privyUser === null) {
            login();
            return;
        }
        toggleEndorsePopoverOpen();
    }, [privyUser, login, toggleEndorsePopoverOpen]);

    const handleNegate = useCallback((pointId: number) => {
        if (privyUser === null) {
            login();
            return;
        }
        setNegatedPointId(pointId);
    }, [privyUser, login, setNegatedPointId]);

    // Memoized values
    const parsePinCommand = useMemo(() => {
        // Multiple checks to ensure we don't show commands in global space
        if (isGlobalSpace || !isInSpecificSpace || spaceData.data?.id === 'global') {
            return null;
        }

        // Not a command or not a pin command or no content
        if (!point?.isCommand || !point.content || !point.content.startsWith('/pin ')) {
            return null;
        }

        const parts = point.content.split(' ').filter(Boolean);
        if (parts.length < 2) {
            return null;
        }

        return parts[1]; // The encoded ID
    }, [isInSpecificSpace, point?.isCommand, point?.content, spaceData.data?.id, isGlobalSpace]);

    const isPinned = useMemo(() => {
        // Don't show pinned indicators unless in a specific space
        if (!isInSpecificSpace) return false;
        return spaceData.data?.pinnedPointId === point?.pointId;
    }, [spaceData.data?.pinnedPointId, point?.pointId, isInSpecificSpace]);

    // Event handlers
    const handleTargetPointClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (parsePinCommand && spaceData.data?.id && isInSpecificSpace) {
            push(`/s/${spaceData.data.id}/${parsePinCommand}`);
        }
    };

    const handleCommandPointClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Navigate to the command point only if this is actually pinned
        if (point?.pinnedByCommandId && spaceData.data?.id && isInSpecificSpace && isPinned) {
            const encodedCommandId = encodeId(point.pinnedByCommandId);
            push(`/s/${spaceData.data.id}/${encodedCommandId}`);
        }
    };

    const handleNegationHover = useCallback((negationId: number) => {
        setHoveredPointId(negationId);
        const queryKey = [negationId, "point", privyUser?.id];
        const existingData = queryClient.getQueryData(queryKey);
        if (!existingData) {
            prefetchPoint(negationId);
        }
    }, [prefetchPoint, queryClient, privyUser?.id, setHoveredPointId]);

    const handleNegationHoverEnd = useCallback(() => {
        setHoveredPointId(undefined);
    }, [setHoveredPointId]);

    const isPointOwner = useMemo(() => {
        return point?.createdBy === privyUser?.id;
    }, [point?.createdBy, privyUser?.id]);

    const canDeletePoint = useMemo(() => {
        if (!point?.createdAt || !isPointOwner) return false;
        return isWithinDeletionTimelock(point.createdAt);
    }, [point?.createdAt, isPointOwner]);

    // Reset loading state when route changes
    useEffect(() => {
        setLoadingCardId(null);
        return () => {
            setLoadingCardId(null);
        };
    }, [pathname]);

    // Function to handle card navigation with loading state
    const handleCardClick = useCallback((id: string) => {
        setLoadingCardId(id);
    }, []);

    const handleCopyMarkdownLink = useCallback(async () => {
        if (!point || !point.content || typeof point.pointId !== 'number') return;

        const currentSpaceId = spaceData.data?.id!;

        const pointUrlPath = getPointUrl(point.pointId, currentSpaceId);
        const fullUrl = `${window.location.origin}${pointUrlPath}`;
        const escapedContent = point.content.replace(/([\[\\]\\(\\)])/g, '\\$1');
        const markdownLink = `[${escapedContent}](${fullUrl})`;

        try {
            await navigator.clipboard.writeText(markdownLink);
            toast.success("Markdown link copied to clipboard!");
        } catch (err) {
            console.error("Failed to copy markdown link: ", err);
            toast.error("Failed to copy link.");
        }
    }, [point, spaceData.data]);

    if (!isLoadingPoint && point === null && !isRedirecting) {
        notFound();
    }

    if (isRedirecting) {
        return (
            <main className="flex items-center justify-center flex-grow">
                <Loader className="size-6" />
            </main>
        );
    }

    // Early return for loading state
    if (!ready) {
        return (
            <main className="flex items-center justify-center flex-grow">
                <Loader className="size-6" />
            </main>
        );
    }

    return (
        <main
            data-canvas-enabled={canvasEnabled}
            className="relative flex-grow sm:grid sm:grid-cols-[1fr_minmax(200px,600px)_1fr] data-[canvas-enabled=true]:md:grid-cols-[0_minmax(200px,400px)_1fr] bg-background"
        >
            <div className="w-full sm:col-[2] flex flex-col border-x pb-10 overflow-auto">
                {isLoadingPoint && (
                    <Loader className="absolute self-center my-auto top-0 bottom-0" />
                )}

                {point && (
                    <div className="@container/point relative flex-grow bg-background">
                        <div className={cn(
                            "sticky top-0 z-10 w-full flex flex-wrap items-center justify-start gap-3 gap-y-2 px-4 py-3 bg-background/70 backdrop-blur",
                            !canvasEnabled && "sm:flex-nowrap sm:justify-between"
                        )}>
                            <div className={cn(
                                "flex items-center gap-2 w-full",
                                !canvasEnabled && "sm:w-auto"
                            )}>
                                <Button
                                    variant={"link"}
                                    size={"icon"}
                                    className="text-foreground -ml-3"
                                    data-action-button="true"
                                    onClick={backButtonHandler}
                                >
                                    <ArrowLeftIcon />
                                </Button>
                                {spaceData.data ? (
                                    <>
                                        <Avatar className="border-4 border-background h-12 w-12">
                                            {spaceData.data.icon && (
                                                <AvatarImage
                                                    src={spaceData.data.icon}
                                                    alt={`s/${spaceData.data.id} icon`}
                                                />
                                            )}
                                            <AvatarFallback className="text-xl font-bold text-muted-foreground">
                                                {spaceData.data.id.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <h1 className="text-lg  font-semibold">
                                            s/{spaceData.data.id}
                                        </h1>
                                    </>
                                ) : null}
                            </div>
                            <div className={cn(
                                "flex w-full gap-sm items-center justify-start text-muted-foreground",
                                !canvasEnabled && "sm:w-auto sm:justify-end"
                            )}>
                                <Button
                                    variant="ghost"
                                    className="p-2 rounded-full size-fit hover:bg-muted/30"
                                    data-action-button="true"
                                    onClick={() => toggleSelectNegationDialog(true)}
                                >
                                    <Repeat2Icon className="size-6 stroke-1" />
                                </Button>
                                <Button
                                    size={"icon"}
                                    variant={canvasEnabled ? "default" : "outline"}
                                    className="rounded-full p-2 size-9"
                                    data-action-button="true"
                                    onClick={() => {
                                        const newParams = new URLSearchParams(searchParams?.toString() || "");
                                        if (!canvasEnabled) {
                                            newParams.set("view", "graph");
                                        } else {
                                            newParams.delete("view"); // eslint-disable-line drizzle/enforce-delete-with-where
                                        }
                                        push(`?${newParams.toString()}`);
                                        setCanvasEnabled(!canvasEnabled);
                                    }}
                                >
                                    <NetworkIcon className="" />
                                </Button>
                                <div className="flex gap-sm">
                                    <Popover
                                        open={endorsePopoverOpen}
                                        onOpenChange={toggleEndorsePopoverOpen}
                                    >
                                        <PopoverTrigger asChild>
                                            <EndorseButton
                                                data-action-button="true"
                                                userCredAmount={point.viewerCred && point.viewerCred > 0 ? point.viewerCred : undefined}
                                                isActive={endorsedByViewer}
                                                className="@md/point:border @md/point:px-4"
                                                buttonSize="default"
                                                {...{ "aria-expanded": endorsePopoverOpen }}
                                                onClick={(e) => {
                                                    if (e) {
                                                        e.preventDefault();
                                                    }
                                                    if (privyUser === null) {
                                                        login();
                                                        return;
                                                    }
                                                    toggleEndorsePopoverOpen();
                                                }}
                                            />
                                        </PopoverTrigger>

                                        <PopoverContent className="flex flex-col items-start w-[calc(100vw-2rem)] sm:w-[420px] p-4">
                                            <div className="w-full flex justify-between gap-4">
                                                <CredInput
                                                    credInput={cred}
                                                    setCredInput={setCred}
                                                    notEnoughCred={notEnoughCred}
                                                    endorsementAmount={point.viewerCred || 0}
                                                    isSelling={isSelling}
                                                    setIsSelling={setIsSelling}
                                                />
                                                <Button
                                                    disabled={cred === 0 || (!isSelling && notEnoughCred) || (isSelling && cred > (point.viewerCred || 0)) || isEndorsing || isSellingEndorsement}
                                                    onClick={handleEndorseOrSell}
                                                >
                                                    {isEndorsing || isSellingEndorsement ? (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <span className="size-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                                                            <span>{isSelling ? 'Selling...' : 'Endorsing...'}</span>
                                                        </div>
                                                    ) : (
                                                        <span>{isSelling ? 'Sell' : 'Endorse'}</span>
                                                    )}
                                                </Button>
                                            </div>
                                            {(notEnoughCred && !isSelling) && (
                                                <span className="mt-2 text-destructive text-sm">
                                                    not enough cred
                                                </span>
                                            )}
                                            {(isSelling && cred > (point.viewerCred || 0)) && (
                                                <span className="mt-2 text-destructive text-sm">
                                                    Cannot sell more than endorsed amount
                                                </span>
                                            )}
                                        </PopoverContent>
                                    </Popover>
                                    <NegateButton
                                        data-action-button="true"
                                        userCredAmount={point.viewerNegationsCred && point.viewerNegationsCred > 0 ? point.viewerNegationsCred : undefined}
                                        isActive={point.viewerNegationsCred > 0}
                                        showSuccess={recentlyNegated}
                                        className="@md/point:border @md/point:px-4"
                                        buttonSize="default"
                                        onClick={() => {
                                            if (privyUser === null) {
                                                login();
                                                return;
                                            }
                                            if (point?.pointId) {
                                                handleNegate(point.pointId);
                                            }
                                        }}
                                    />
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            className="p-2 rounded-full size-fit hover:bg-muted/30"
                                            data-action-button="true"
                                            title="More options"
                                        >
                                            <MoreVertical className="size-6 stroke-1" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            onClick={handleCopyMarkdownLink}
                                            disabled={!point?.content}
                                            className="cursor-pointer"
                                        >
                                            <ClipboardCopyIcon className="mr-2 size-4" />
                                            <span>Copy Markdown Link</span>
                                        </DropdownMenuItem>

                                        {point?.isEdited && (
                                            <DropdownMenuItem
                                                onClick={() => setHistoryDialogOpen(true)}
                                                className="cursor-pointer"
                                            >
                                                <HistoryIcon className="mr-2 size-4" />
                                                <span>View history ({point?.editCount || 0} edit{(point?.editCount || 0) !== 1 ? 's' : ''})</span>
                                            </DropdownMenuItem>
                                        )}

                                        {isPointOwner && (
                                            <DropdownMenuItem
                                                onClick={() => setEditDialogOpen(true)}
                                                className="cursor-pointer"
                                            >
                                                <EditIcon className="mr-2 size-4" />
                                                <span>Edit point</span>
                                            </DropdownMenuItem>
                                        )}

                                        {isPointOwner && (
                                            <DropdownMenuItem
                                                onClick={() => setDeleteDialogOpen(true)}
                                                disabled={!canDeletePoint}
                                                className={cn(
                                                    "cursor-pointer",
                                                    !canDeletePoint ? "opacity-50 cursor-not-allowed" : "text-destructive focus:text-destructive focus:bg-destructive/10"
                                                )}
                                                title={!canDeletePoint ? "Points can only be deleted within 8 hours of creation" : "Delete this point"}
                                            >
                                                <TrashIcon disabled={!canDeletePoint} className="mr-2 size-4" />
                                                <div className="flex flex-col">
                                                    <span>Delete point</span>
                                                    {!canDeletePoint && (
                                                        <span className="text-xs text-muted-foreground">Only available within 8 hours of creation</span>
                                                    )}
                                                </div>
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        <div
                            data-show-hover={canvasEnabled && hoveredPointId === pointId}
                            onMouseEnter={() => setHoveredPointId(pointId)}
                            onMouseLeave={() => setHoveredPointId(undefined)}
                            className=" px-4 py-3 border-b data-[show-hover=true]:border-l-4 data-[show-hover=true]:border-l-blue-500 data-[show-hover=true]:dark:border-l-blue-400"
                        >
                            {point?.isObjection && point?.objectionTargetId && (
                                <div className="mb-2 flex justify-start">
                                    <ObjectionHeader id={point.pointId} parentId={point.objectionTargetId} space={space} />
                                </div>
                            )}
                            <div className="flex items-start gap-2">
                                <p className="tracking-tight text-md @xs/point:text-md @sm/point:text-lg mb-sm break-words whitespace-normal min-w-0">
                                    {point?.content}
                                </p>
                                {point?.isEdited && (
                                    <Badge variant="secondary" className="text-xs shrink-0 bg-muted/50 text-muted-foreground border-muted">
                                        Edited
                                    </Badge>
                                )}

                                {/* Show different badges based on pin status */}
                                {isPinned && isInSpecificSpace && point?.pinnedByCommandId && (
                                    <Badge variant="outline" className="text-xs shrink-0">
                                        <Link
                                            href={getPointUrl(point.pinnedByCommandId, spaceData.data?.id || 'global')}
                                            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                                                e.stopPropagation();
                                            }}
                                            className="inline-block w-full h-full"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Button
                                                type="button"
                                                variant="link"
                                                className="h-auto p-0 text-muted-foreground hover:text-foreground w-full"
                                                data-action-button="true"
                                                onClick={handleCommandPointClick}
                                            >
                                                Pinned by command
                                            </Button>
                                        </Link>
                                    </Badge>
                                )}
                                {parsePinCommand && !isPinned && isInSpecificSpace && (
                                    <Badge variant="outline" className="text-xs shrink-0">
                                        <Link
                                            href={getPointUrl(parsePinCommand, spaceData?.data?.id || 'global')}
                                            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                            }}
                                            className="inline-block w-full h-full"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Button
                                                type="button"
                                                variant="link"
                                                className="h-auto p-0 text-muted-foreground hover:text-foreground w-full"
                                                data-action-button="true"
                                                onClick={handleTargetPointClick}
                                            >
                                                Proposal to pin
                                            </Button>
                                        </Link>
                                    </Badge>
                                )}
                            </div>
                            <div className="text-muted-foreground text-sm space-y-1">
                                <div>
                                    {point?.createdAt && format(point.createdAt, "h':'mm a '·' MMM d',' yyyy")}
                                </div>
                                {point?.isEdited && point?.editedAt && (
                                    <div className="text-xs text-muted-foreground/80">
                                        Last edited {formatDistanceToNow(point.editedAt, { addSuffix: true })}
                                        {point?.editCount && point.editCount > 1 && (
                                            <span> • {point.editCount} edit{point.editCount !== 1 ? 's' : ''}</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            <>
                                {/* Check if we're using limited fallback data */}
                                {favorHistory &&
                                    favorHistory.length === 2 &&
                                    favorHistory[0].favor === favorHistory[1].favor && (
                                        <div className="text-sm text-muted-foreground mb-1 mt-4">
                                            Limited history available
                                        </div>
                                    )}
                                <ResponsiveContainer
                                    width="100%"
                                    height={100}
                                    className={"mt-md"}
                                >
                                    <LineChart
                                        width={300}
                                        height={100}
                                        data={favorHistory && Array.isArray(favorHistory) && favorHistory.length > 0
                                            ? favorHistory
                                            : [{ timestamp: new Date(), favor: point?.favor || 50 }]}
                                        className="[&>.recharts-surface]:overflow-visible"
                                    >
                                        <XAxis dataKey="timestamp" hide />
                                        <YAxis domain={[0, 100]} hide />
                                        <ReferenceLine
                                            y={50}
                                            className="[&>line]:stroke-muted"
                                        ></ReferenceLine>
                                        <Line
                                            animationDuration={300}
                                            dataKey="favor"
                                            type="stepAfter"
                                            className="overflow-visible text-endorsed"
                                            dot={({ key, ...dot }) => {
                                                // Safely check if we have valid data to render
                                                if (!favorHistory || !Array.isArray(favorHistory) || favorHistory.length === 0 || dot.index === undefined) {
                                                    // Just render the current point as a single dot if no history
                                                    if (dot.cx && dot.cy) {
                                                        return (
                                                            <Fragment key={key}>
                                                                <Dot
                                                                    {...dot}
                                                                    fill={dot.stroke || 'currentColor'}
                                                                    className="animate-pulse"
                                                                    style={{
                                                                        transformOrigin: `${dot.cx}px ${dot.cy}px`,
                                                                    }}
                                                                />
                                                            </Fragment>
                                                        );
                                                    }
                                                    return <Fragment key={key} />;
                                                }

                                                // Otherwise show the last point in the history
                                                return dot.index === favorHistory.length - 1 ? (
                                                    <Fragment key={key}>
                                                        <Dot
                                                            {...dot}
                                                            fill={dot.stroke || 'currentColor'}
                                                            className="animate-ping"
                                                            style={{
                                                                transformOrigin: `${dot.cx}px ${dot.cy}px`,
                                                            }}
                                                        />
                                                        <Dot {...dot} fill={dot.stroke || 'currentColor'} />
                                                    </Fragment>
                                                ) : (
                                                    <Fragment key={key} />
                                                );
                                            }}
                                            stroke={"currentColor"}
                                            strokeWidth={2}
                                        />

                                        <Tooltip
                                            wrapperClassName="backdrop-blur-sm !bg-transparent !pb-0 rounded-sm"
                                            labelClassName=" -top-3 text-muted-foreground text-xs"
                                            formatter={(value: number) => value ? value.toFixed(2) : "0.00"}
                                            labelFormatter={(timestamp: Date) => timestamp ? timestamp.toLocaleString() : new Date().toLocaleString()}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                                <ToggleGroup
                                    type="single"
                                    value={timelineScale}
                                    onValueChange={(v) =>
                                        v && setTimelineScale(v as TimelineScale)
                                    }
                                    className="flex gap-px w-fit"
                                >
                                    {timelineScales.map((scale) => (
                                        <ToggleGroupItem
                                            value={scale}
                                            className="w-10 h-6 text-sm text-muted-foreground"
                                            key={scale}
                                        >
                                            {scale}
                                        </ToggleGroupItem>
                                    ))}
                                    <Loader
                                        className="text-muted-foreground size-4 ml-2"
                                        style={{
                                            display: isFetchingFavorHistory ? "block" : "none",
                                        }}
                                    />
                                </ToggleGroup>
                            </>

                            <Separator className="my-md" />
                            <PointStats
                                className="justify-evenly ~@/lg:~text-xs/sm mb-sm"
                                favor={point.favor}
                                amountNegations={point.amountNegations}
                                amountSupporters={point.amountSupporters}
                                cred={point.cred}
                            />

                            {/* Delta Comparison Widget */}
                            <div className="mt-6">
                                <DeltaComparisonWidget
                                    comparison={{ type: "point", pointId: point.pointId }}
                                    title="Point Alignment Discovery"
                                    description="Find users who agree or disagree with you on this point cluster"
                                    currentUserId={privyUser?.id}
                                    spaceId={space}
                                />
                            </div>
                        </div>
                        <div className="relative flex flex-col">
                            {isLoadingNegations || (forceShowNegations && (!Array.isArray(negations) || negations.length === 0)) ? (
                                <div className="space-y-4">
                                    {/* Show animated skeletons with varying widths for a more realistic appearance */}
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <div
                                            key={`skeleton-${i}`}
                                            className="animate-pulse border border-border rounded-lg p-4"
                                            // Add staggered animation delay for each skeleton to create a wave effect
                                            style={{ animationDelay: `${i * 100}ms` }}
                                        >
                                            <div className="flex items-center space-x-2 mb-4">
                                                <div className="rounded-full bg-secondary h-8 w-8"></div>
                                                <div
                                                    className="h-4 bg-secondary rounded"
                                                    // Vary widths of username and other elements
                                                    style={{ width: `${55 + (i % 3) * 10}%`, opacity: 1 - (i * 0.15) }}
                                                ></div>
                                            </div>
                                            <div
                                                className="h-3 bg-secondary rounded mb-2"
                                                style={{ width: `${85 - (i % 4) * 10}%`, opacity: 1 - (i * 0.1) }}
                                            ></div>
                                            <div
                                                className="h-3 bg-secondary rounded mb-2"
                                                style={{ width: `${65 + (i % 3) * 15}%`, opacity: 1 - (i * 0.1) }}
                                            ></div>
                                            <div
                                                className="h-3 bg-secondary rounded"
                                                style={{ width: `${45 - (i % 2) * 15}%`, opacity: 1 - (i * 0.1) }}
                                            ></div>
                                            <div className="flex justify-between mt-3">
                                                <div className="h-4 bg-secondary rounded w-16" style={{ opacity: 0.7 - (i * 0.1) }}></div>
                                                <div className="h-4 bg-secondary rounded w-12" style={{ opacity: 0.7 - (i * 0.1) }}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                Array.isArray(negations) && negations.length > 0 ? (
                                    <div className="animate-fade-in">
                                        {negations
                                            .filter(Boolean)
                                            // Filter out this point's ID from the negations list
                                            .filter(negation => negation.pointId !== pointId)
                                            .map((negation, i) => (
                                                <div
                                                    key={`${negation.pointId}-${i}`}
                                                    data-show-hover={canvasEnabled && hoveredPointId === negation.pointId}
                                                    className="relative border-b data-[show-hover=true]:border-l-4 data-[show-hover=true]:border-l-blue-500 data-[show-hover=true]:dark:border-l-blue-400"
                                                >
                                                    <NegationCard
                                                        negation={negation}
                                                        viewParam={viewParam}
                                                        basePath={basePath}
                                                        privyUser={privyUser}
                                                        login={login}
                                                        handleNegate={handleNegate}
                                                        point={point}
                                                        prefetchRestakeData={prefetchRestakeData}
                                                        setRestakePoint={setRestakePoint}
                                                        handleNegationHover={handleNegationHover}
                                                        handleNegationHoverEnd={handleNegationHoverEnd}
                                                        prefetchPoint={prefetchPoint}
                                                        loadingCardId={loadingCardId}
                                                        onCardClick={handleCardClick}
                                                    />
                                                </div>
                                            ))
                                        }
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in">
                                        <div className="mb-4 text-muted-foreground">
                                            <div className="size-8 mx-auto mb-2 text-muted-foreground">
                                                <NegateIcon className="w-full h-full" />
                                            </div>
                                            <h3 className="text-lg font-medium mb-1">No negations yet</h3>
                                            <p className="text-sm text-muted-foreground max-w-[300px]">
                                                Challenge this point by creating a negation. It&apos;s a great way to engage in constructive debate.
                                            </p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            className="gap-2 items-center"
                                            onClick={() => {
                                                if (privyUser === null) {
                                                    login();
                                                    return;
                                                }
                                                handleNegate(point.pointId);
                                            }}
                                        >
                                            <NegateIcon className="size-4 flex-shrink-0" />
                                            Create Negation
                                        </Button>
                                    </div>
                                )
                            )}

                            {counterpointSuggestions.length > 0 && (
                                <>
                                    <p className="w-full text-center text-muted-foreground text-xs p-4 animate-fade-in">
                                        Want to add a negation? Try starting with one of these
                                        AI-generated ones{" "}
                                        <SparklesIcon className="size-3 inline-block align-baseline" />
                                    </p>
                                    {counterpointSuggestions.map((suggestion, i) => (
                                        <div
                                            key={`suggestion-${i}`}
                                            className="flex gap-3 mt-3 mx-2 px-3 py-4 rounded-md border border-dashed hover:bg-muted cursor-pointer animate-fade-in active:scale-95 transition-transform"
                                            onClick={() => {
                                                if (privyUser === null) {
                                                    login();
                                                    return;
                                                }
                                                setNegationContent(pointId, suggestion);
                                                setNegatedPointId(point.pointId);
                                            }}
                                        >
                                            <div className="relative grid text-muted-foreground">
                                                <CircleXIcon className="shrink-0 size-6 stroke-1 text-muted-foreground col-start-1 row-start-1" />
                                            </div>
                                            <p className="tracking-tighter text-sm @sm/point:text-base -mt-0.5">
                                                {suggestion}
                                            </p>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
            {canvasEnabled && (
                <ReactFlowProvider>
                    <PointPageGraphWrapper
                        initialNodes={initialNodes}
                        rootPointId={pointId}
                        onClose={() => {
                            const newParams = new URLSearchParams(searchParams?.toString() || "");
                            newParams.delete("view"); // eslint-disable-line drizzle/enforce-delete-with-where
                            push(`?${newParams.toString()}`);
                            setCanvasEnabled(false);
                        }}
                        searchParams={searchParams}
                        push={push}
                    />
                </ReactFlowProvider>
            )}

            <SelectNegationDialog
                open={selectNegationDialogOpen}
                onOpenChange={toggleSelectNegationDialog}
                originalPoint={{
                    id: point?.pointId ?? 0,
                    content: point?.content ?? "",
                    createdAt: point?.createdAt ?? new Date(),
                    stakedAmount: point?.cred ?? 0,
                    viewerCred: point?.viewerCred,
                    amountSupporters: point?.amountSupporters ?? 0,
                    amountNegations: point?.amountNegations ?? 0,
                    negationsCred: point?.negationsCred ?? 0,
                }}
                negationId={point?.pointId ?? 0}
            />

            {restakePoint && (
                <RestakeDialog
                    open={restakePoint !== null}
                    onOpenChange={(open) => !open && setRestakePoint(null)}
                    originalPoint={restakePoint.point}
                    counterPoint={restakePoint.counterPoint}
                    onEndorseClick={() => toggleEndorsePopoverOpen(true)}
                    openedFromSlashedIcon={restakePoint.openedFromSlashedIcon}
                />
            )}

            {point && (
                <DeletePointDialog
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                    pointId={point.pointId}
                    createdAt={point.createdAt}
                />
            )}

            {point && (
                <PointEditDialog
                    open={editDialogOpen}
                    onOpenChange={setEditDialogOpen}
                    pointId={point.pointId}
                    currentContent={point.content}
                    canEdit={isPointOwner}
                />
            )}

            <PointHistoryDialog
                open={historyDialogOpen}
                onOpenChange={setHistoryDialogOpen}
                pointId={pointId || 0}
                isEdited={point?.isEdited || false}
                editCount={point?.editCount || 0}
            />
        </main>
    );
}

// Point History Dialog Component
interface PointHistoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pointId: number;
    isEdited: boolean;
    editCount: number;
}

const PointHistoryDialog = ({
    open,
    onOpenChange,
    pointId,
    isEdited,
    editCount
}: PointHistoryDialogProps) => {
    const { data: history, isLoading } = useQuery({
        queryKey: ['point-history', pointId],
        queryFn: () => fetchPointHistory(pointId, 10),
        enabled: open && isEdited,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    if (!isEdited || editCount === 0) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader className="flex-shrink-0 pb-4">
                    <DialogTitle className="text-xl">Version History</DialogTitle>
                    <p className="text-sm text-muted-foreground">
                        {editCount} edit{editCount !== 1 ? 's' : ''} made to this point
                    </p>
                </DialogHeader>

                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-muted-foreground">Loading version history...</p>
                        </div>
                    ) : history && history.length > 0 ? (
                        <div className="space-y-4 pr-2">
                            {history.map((entry, index) => (
                                <div key={entry.id} className="relative">
                                    {index < history.length - 1 && (
                                        <div className="absolute left-6 top-12 bottom-0 w-px bg-border" />
                                    )}

                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mt-1">
                                            <span className="text-xs font-medium text-primary">
                                                {entry.action === 'created' ? 'C' : 'E'}
                                            </span>
                                        </div>

                                        <div className="flex-1 min-w-0 pb-6">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium capitalize">
                                                        {entry.action}
                                                    </span>
                                                    {entry.user.username && (
                                                        <span className="text-sm text-muted-foreground">
                                                            by {entry.user.username}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {formatDistanceToNow(entry.createdAt, { addSuffix: true })}
                                                </span>
                                            </div>

                                            {entry.action === 'edited' && entry.previousContent && (
                                                <div className="space-y-3 mb-4">
                                                    <div>
                                                        <div className="text-sm font-medium text-destructive mb-2">Previous content:</div>
                                                        <div className="bg-destructive/5 border border-destructive/20 p-3 rounded-md text-sm max-h-40 overflow-y-auto whitespace-pre-wrap break-words">
                                                            {entry.previousContent}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div>
                                                <div className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                                                    {entry.action === 'created' ? 'Initial content:' : 'Updated content:'}
                                                </div>
                                                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30 p-3 rounded-md text-sm max-h-40 overflow-y-auto whitespace-pre-wrap break-words">
                                                    {entry.newContent}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                                <HistoryIcon className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="font-medium mb-2">No edit history</h3>
                            <p className="text-sm text-muted-foreground">
                                This point hasn&apos;t been edited yet.
                            </p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

interface PointPageGraphWrapperProps {
    initialNodes: any[];
    rootPointId: number;
    onClose: () => void;
    searchParams: URLSearchParams | null;
    push: (url: string) => void;
}

const PointPageGraphWrapper = ({
    initialNodes,
    rootPointId,
    onClose,
    searchParams,
    push
}: PointPageGraphWrapperProps) => {
    const [flowInstance, setFlowInstance] = useState<ReactFlowInstance<AppNode> | null>(null);
    const [nodes, setNodes, onNodesChangeDefault] = useNodesState<AppNode>(initialNodes);
    const [edges, setEdges, onEdgesChangeDefault] = useEdgesState<Edge>([]);

    const uniquePoints = useGraphPoints();
    const pointIds = useMemo(() => uniquePoints.map((p) => p.pointId), [uniquePoints]);

    useCollapseUndo();

    useGraphInitialization({
        flowInstance,
        defaultNodes: initialNodes,
        defaultEdges: [],
        nodes,
        edges,
        setNodes,
        setEdges,
    });

    useChunkedPrefetchPoints(flowInstance, nodes);

    const { data: pointsData } = useQuery<PointData[]>({
        queryKey: ['graph-creds', pointIds],
        queryFn: () => fetchPoints(pointIds),
        enabled: pointIds.length > 0,
        staleTime: 5 * 60 * 1000,
    });

    const creds = pointsData?.map((p) => p.cred ?? 0) ?? [];
    const minCred = creds.length > 0 ? Math.min(...creds) : 0;
    const maxCred = creds.length > 0 ? Math.max(...creds) : 0;

    const filteredEdges = useFilteredEdges(nodes, edges);


    const onInit = (instance: ReactFlowInstance<AppNode>) => {
        setFlowInstance(instance);
    };

    const onNodesChange = useCallback(
        (changes: NodeChange<AppNode>[]) => {
            onNodesChangeDefault(changes);
        },
        [onNodesChangeDefault]
    );

    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            onEdgesChangeDefault(changes);
        },
        [onEdgesChangeDefault]
    );


    return (
        <GraphSizingContext.Provider value={{ minCred, maxCred }}>
            <GraphView
                onInit={onInit}
                defaultNodes={nodes}
                defaultEdges={filteredEdges}
                canModify={false}
                canvasEnabled={true}
                className="!fixed md:!sticky inset-0 top-[var(--header-height)] md:inset-[reset] !h-[calc(100vh-var(--header-height))] md:top-[var(--header-height)] md: !z-10 md:z-auto"
                isNew={true}
                isSaving={false}
                isContentModified={false}
                onSaveChanges={async () => false}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                hideShareButton={true}
                hideSavePanel={true}
                hideComments={true}
                nodesDraggable={true}
                rootPointId={rootPointId}
                onClose={onClose}
                closeButtonClassName="md:hidden"
                statement=""
                description="Point exploration graph - changes are temporary and not saved"
                disableNotOwnerWarning={true}
            />
        </GraphSizingContext.Provider>
    );
}; 