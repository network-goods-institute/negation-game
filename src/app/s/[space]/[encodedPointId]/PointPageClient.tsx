"use client";

import { format } from "date-fns";
import { useMemo, useState, useEffect, memo } from "react";
import Link from "next/link";
import { Suspense } from "react";

import { canvasEnabledAtom } from "@/atoms/canvasEnabledAtom";
import { hoveredPointIdAtom } from "@/atoms/hoveredPointIdAtom";
import { negatedPointIdAtom } from "@/atoms/negatedPointIdAtom";
import { negationContentAtom } from "@/atoms/negationContentAtom";
import { CredInput } from "@/components/CredInput";
import { NegateDialog } from "@/components/NegateDialog";
import { PointCard } from "@/components/PointCard";
import { PointStats } from "@/components/PointStats";
import { RestakeDialog } from "@/components/RestakeDialog";
import { SelectNegationDialog } from "@/components/SelectNegationDialog";
import { GraphView } from "@/components/graph/EncodedGraphView";
import { EndorseIcon } from "@/components/icons/EndorseIcon";
import { NegateIcon } from "@/components/icons/NegateIcon";
import { PointIcon } from "@/components/icons/AppIcons";
import { TrashIcon } from "@/components/icons/TrashIcon";
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
import { DEFAULT_SPACE, DEFAULT_TIMESCALE } from "@/constants/config";
import { useBasePath } from "@/hooks/useBasePath";
import { useCredInput } from "@/hooks/useCredInput";
import { useVisitedPoints } from "@/hooks/useVisitedPoints";
import { cn } from "@/lib/cn";
import { decodeId } from "@/lib/decodeId";
import { encodeId } from "@/lib/encodeId";
import { preventDefaultIfContainsSelection } from "@/lib/preventDefaultIfContainsSelection";
import { TimelineScale, timelineScales } from "@/lib/timelineScale";
import { useEndorse } from "@/mutations/useEndorse";
import { useCounterpointSuggestions } from "@/queries/useCounterpointSuggestions";
import { useFavorHistory } from "@/queries/useFavorHistory";
import { usePrefetchPoint } from "@/queries/usePointData";
import { usePointNegations } from "@/queries/usePointNegations";
import { useSpace } from "@/queries/useSpace";
import { useUser } from "@/queries/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { AvatarImage } from "@radix-ui/react-avatar";
import { useToggle } from "@uidotdev/usehooks";
import { ReactFlowProvider } from "@xyflow/react";
import { useAtom, useSetAtom } from "jotai";
import { useAtomCallback } from "jotai/utils";
import {
    ArrowLeftIcon,
    CircleXIcon,
    NetworkIcon,
    Repeat2Icon,
    SparklesIcon,
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
import { usePointData, pointQueryKey } from "@/queries/usePointData";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { usePrefetchRestakeData } from "@/hooks/usePrefetchRestakeData";
import { visitedPointsAtom } from "@/atoms/visitedPointsAtom";
import { DeletePointDialog } from "@/components/DeletePointDialog";
import { isWithinDeletionTimelock } from "@/lib/deleteTimelock";

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
};

type PageProps = {
    params: { encodedPointId: string; space: string };
    searchParams: { [key: string]: string | string[] | undefined };
};

// Create an optimized negation card component with improved loading
const NegationCard = memo(({ negation, viewParam, basePath, privyUser, login, handleNegate, point, prefetchRestakeData, setRestakePoint, handleNegationHover, prefetchPoint }: any) => {
    const [favorHistoryLoaded, setFavorHistoryLoaded] = useState(false);
    const favorHistoryKey = useMemo(() => [negation.pointId, "favor-history", "1W"], [negation.pointId]);
    const queryClient = useQueryClient();

    // Only prefetch favor history on hover
    const handleHover = useCallback(() => {
        handleNegationHover(negation.pointId);

        // Try to fetch favor history if not already loaded
        if (!favorHistoryLoaded) {
            import("@/actions/fetchFavorHistory")
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
        <Link
            data-show-hover={false}
            draggable={false}
            onClick={(e) => {
                prefetchPoint(negation.pointId);
                preventDefaultIfContainsSelection(e);
            }}
            href={`${basePath}/${encodeId(negation.pointId)}${viewParam ? `?view=${viewParam}` : ""}`}
            key={negation.pointId}
            className="flex cursor-pointer px-4 pt-5 pb-2 border-b hover:bg-accent"
            onMouseEnter={handleHover}
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
                className="flex-grow -mt-3.5 pb-3"
                favor={negation.favor}
                content={negation.content}
                createdAt={negation.createdAt}
                amountSupporters={negation.amountSupporters}
                amountNegations={negation.amountNegations}
                pointId={negation.pointId}
                cred={negation.cred}
                viewerContext={{ viewerCred: negation.viewerCred }}
                isNegation={true}
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
            />
        </Link>
    );
});
NegationCard.displayName = 'NegationCard';

export function PointPageClient({
    params,
    searchParams: initialSearchParams,
}: PageProps) {
    const { user: privyUser, login, ready } = usePrivy();
    const { encodedPointId, space } = params;
    const pointId = decodeId(encodedPointId);
    const setNegatedPointId = useSetAtom(negatedPointIdAtom);
    const queryClient = useQueryClient();
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
    } = usePointData(pointId);
    const [timelineScale, setTimelineScale] = useState<TimelineScale>(DEFAULT_TIMESCALE);
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
    const router = useRouter();
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
    const { mutate: endorse } = useEndorse();
    const [_, setVisitedPoints] = useAtom(visitedPointsAtom);
    const [recentlyNegated, setRecentlyNegated] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [forceShowNegations, setForceShowNegations] = useState(false);
    const [negationsLoadStartTime] = useState(() => Date.now());

    // Load additional data after point data is loaded
    useEffect(() => {
        if (point && !isLoadingPoint) {
            // Load negations
            queryClient.prefetchQuery({
                queryKey: ["point-negations", pointId, privyUser?.id],
                queryFn: async () => {
                    const { fetchPointNegations } = await import("@/actions/fetchPointNegations");
                    return fetchPointNegations(pointId);
                },
                staleTime: 15_000,
            });

            queryClient.prefetchQuery({
                queryKey: [pointId, "favor-history", "1W"],
                queryFn: async () => {
                    const { fetchFavorHistory } = await import("@/actions/fetchFavorHistory");
                    return fetchFavorHistory({
                        pointId,
                        scale: "1W"
                    });
                },
                staleTime: 15_000,
            });
        }
    }, [point, pointId, queryClient, privyUser?.id, isLoadingPoint]);

    useEffect(() => {
        if (point && !isLoadingPoint && Array.isArray(negations)) {
            // Delay loading of restake/doubt data to prioritize main content
            setTimeout(() => {
                negations.forEach(negation => {
                    if (negation.pointId !== pointId) {
                        prefetchRestakeData(pointId, negation.pointId);

                        // Prefetch favor history for the negation
                        queryClient.prefetchQuery({
                            queryKey: [negation.pointId, "favor-history", "1W"],
                            queryFn: async () => {
                                const { fetchFavorHistory } = await import("@/actions/fetchFavorHistory");
                                return fetchFavorHistory({
                                    pointId: negation.pointId,
                                    scale: "1W"
                                });
                            },
                            staleTime: 15_000,
                        });
                    }
                });
            }, 1000); // Delay by 1 second to prioritize main content
        }
    }, [point, pointId, queryClient, privyUser?.id, isLoadingPoint, negations, prefetchRestakeData]);

    // Force show negations after 2.5 seconds to avoid stalled UI
    useEffect(() => {
        if ((isLoadingNegations || !negations) && !forceShowNegations) {
            console.log(`[Negations] Setting force show timer for ${pointId}`);
            const timerId = setTimeout(() => {
                const elapsed = (Date.now() - negationsLoadStartTime) / 1000;
                console.log(`[Negations] Force showing negations after timeout, elapsed: ${elapsed.toFixed(2)}s`);
                setForceShowNegations(true);
            }, 2000); // Reduced to 2 seconds for even faster feedback

            return () => {
                console.log(`[Negations] Clearing force show timer for ${pointId}`);
                clearTimeout(timerId);
            };
        }
    }, [isLoadingNegations, forceShowNegations, negationsLoadStartTime, pointId, negations]);

    // Log when negations finish loading
    useEffect(() => {
        if (isLoadingNegations) {
            console.log(`[Negations] Started loading negations for point ${pointId}`);
        } else if (negations) {
            const elapsed = (Date.now() - negationsLoadStartTime) / 1000;
            console.log(`[Negations] Loaded ${Array.isArray(negations) ? negations.length : 0} negations for point ${pointId} in ${elapsed.toFixed(2)}s`);
            if (forceShowNegations) {
                console.log(`[Negations] Was force shown before actual data loaded`);
            }
        }
    }, [isLoadingNegations, negations, pointId, negationsLoadStartTime, forceShowNegations]);

    // Memoized values
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

    // Add this effect to mark point data as fresh when navigating back to this page
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

    // Add a new effect to preload data when point is loaded
    useEffect(() => {
        if (point && !isLoadingNegations) {
            // Attempt to load negations data as soon as point data is available
            queryClient.prefetchQuery({
                queryKey: ["point-negations", pointId, privyUser?.id],
                queryFn: async () => {
                    const { fetchPointNegations } = await import("@/actions/fetchPointNegations");
                    return fetchPointNegations(pointId);
                },
                staleTime: 15_000, // Consider fresh for only 15 seconds
            });
        }
    }, [point, pointId, queryClient, privyUser?.id, isLoadingNegations]);

    // Derived state and callbacks
    const isInSpecificSpace = pathname?.includes('/s/') && !pathname.match(/^\/s\/global\//);
    const isGlobalSpace = spaceData.data?.id === 'global' || spaceData.data?.id === 'global/';
    const endorsedByViewer = point?.viewerCred !== undefined && point.viewerCred > 0;

    const loginOrMakePoint = useCallback(() => {
        if (user !== null && point?.pointId) {
            endorse({ pointId: point.pointId, cred });
            toggleEndorsePopoverOpen(false);
        } else {
            login();
        }
    }, [user, login, toggleEndorsePopoverOpen, point?.pointId, endorse, cred]);

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
        // Immediate prefetch - most important data first
        prefetchPoint(negationId);
        prefetchRestakeData(pointId, negationId);

        // Prefetch additional related data with a slight delay
        setTimeout(() => {
            // Also try to prefetch negations of this negation (2nd level)
            queryClient.prefetchQuery({
                queryKey: ["point-negations", negationId, privyUser?.id],
                queryFn: async () => {
                    const { fetchPointNegations } = await import("@/actions/fetchPointNegations");
                    return fetchPointNegations(negationId);
                },
                staleTime: 15_000,
            });

            // Prefetch favor history
            queryClient.prefetchQuery({
                queryKey: [negationId, "favor-history", timelineScale],
                queryFn: async () => {
                    const { fetchFavorHistory } = await import("@/actions/fetchFavorHistory");
                    return fetchFavorHistory({
                        pointId: negationId,
                        scale: timelineScale
                    });
                },
                staleTime: 15_000,
            });
        }, 100); // Small delay to prioritize the main data
    }, [prefetchPoint, prefetchRestakeData, pointId, queryClient, privyUser?.id, timelineScale]);

    const isPointOwner = useMemo(() => {
        return point?.createdBy === privyUser?.id;
    }, [point?.createdBy, privyUser?.id]);

    const canDeletePoint = useMemo(() => {
        if (!point?.createdAt || !isPointOwner) return false;
        return isWithinDeletionTimelock(point.createdAt);
    }, [point?.createdAt, isPointOwner]);

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
                        <div className="sticky top-0 z-10 w-full flex items-center justify-between gap-3 px-4 py-3 bg-background/70 backdrop-blur">
                            <div className="flex items-center gap-2">
                                <Button
                                    variant={"link"}
                                    size={"icon"}
                                    className="text-foreground -ml-3"
                                    onClick={() => {
                                        if (window.history.state?.idx > 0) {
                                            back();
                                            return;
                                        }

                                        push(`${basePath}/`);
                                    }}
                                >
                                    <ArrowLeftIcon />
                                </Button>
                                {spaceData.data && spaceData.data.id !== DEFAULT_SPACE ? (
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
                                ) : (
                                    <>
                                        <PointIcon />
                                        <h1 className="text-xl font-medium">Point</h1>
                                    </>
                                )}
                            </div>
                            <div className="flex gap-sm items-center text-muted-foreground">
                                {isPointOwner && (
                                    <Button
                                        variant="ghost"
                                        className="p-2 rounded-full size-fit hover:bg-destructive/30"
                                        onClick={() => setDeleteDialogOpen(true)}
                                        title={canDeletePoint
                                            ? "Delete point"
                                            : "Points can only be deleted within 8 hours of creation"}
                                    >
                                        <TrashIcon
                                            disabled={!canDeletePoint}
                                        />
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    className="p-2 rounded-full size-fit hover:bg-muted/30"
                                    onClick={() => toggleSelectNegationDialog(true)}
                                >
                                    <Repeat2Icon className="size-6 stroke-1" />
                                </Button>
                                <Button
                                    size={"icon"}
                                    variant={canvasEnabled ? "default" : "outline"}
                                    className="rounded-full p-2 size-9"
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
                                <Popover
                                    open={endorsePopoverOpen}
                                    onOpenChange={toggleEndorsePopoverOpen}
                                >
                                    {endorsedByViewer && (
                                        <span className="align-middle text-sm text-endorsed">
                                            {point.viewerCred} cred
                                        </span>
                                    )}
                                    <PopoverTrigger asChild>
                                        <Button
                                            className={cn(
                                                "p-2 rounded-full size-fit gap-sm hover:bg-endorsed/30",
                                                endorsedByViewer && "text-endorsed",
                                                "@md/point:border @md/point:px-4"
                                            )}
                                            variant={"ghost"}
                                            onClick={handleEndorse}
                                        >
                                            <EndorseIcon
                                                className={cn(
                                                    "@md/point:hidden",
                                                    endorsedByViewer && "fill-current"
                                                )}
                                            />
                                            <span className="hidden @md/point:inline">
                                                {point.viewerCred ? "Endorsed" : "Endorse"}
                                            </span>
                                        </Button>
                                    </PopoverTrigger>

                                    <PopoverContent className="flex flex-col items-start w-96">
                                        <div className="w-full flex justify-between">
                                            <CredInput
                                                credInput={cred}
                                                setCredInput={setCred}
                                                notEnoughCred={notEnoughCred}
                                            />
                                            <Button
                                                disabled={cred === 0 || notEnoughCred}
                                                onClick={() => {
                                                    loginOrMakePoint();
                                                }}
                                            >
                                                Endorse
                                            </Button>
                                        </div>
                                        {notEnoughCred && (
                                            <span className="ml-md text-destructive text-sm h-fit">
                                                not enough cred
                                            </span>
                                        )}
                                    </PopoverContent>
                                </Popover>
                                <Button
                                    variant="ghost"
                                    className={cn(
                                        "p-2  rounded-full size-fit hover:bg-primary/30",
                                        "@md/point:border @md/point:px-4"
                                    )}
                                    onClick={() => {
                                        if (point?.pointId) {
                                            handleNegate(point.pointId);
                                        }
                                    }}
                                >
                                    <NegateIcon
                                        className="@md/point:hidden"
                                        showSuccess={recentlyNegated}
                                    />
                                    <span className="hidden @md/point:inline">Negate</span>
                                </Button>
                            </div>
                        </div>

                        <div
                            data-show-hover={canvasEnabled && hoveredPointId === pointId}
                            onMouseEnter={() => setHoveredPointId(pointId)}
                            onMouseLeave={() => setHoveredPointId(undefined)}
                            className=" px-4 py-3 border-b data-[show-hover=true]:shadow-[inset_0_0_0_2px_hsl(var(--primary))]">
                            <div className="flex items-start gap-2">
                                <p className="tracking-tight text-md @xs/point:text-md @sm/point:text-lg mb-sm break-words whitespace-normal min-w-0">
                                    {point?.content}
                                </p>

                                {/* Show different badges based on pin status */}
                                {isPinned && isInSpecificSpace && spaceData.data?.id !== 'global' && point?.pinnedByCommandId && (
                                    <Badge variant="outline" className="text-xs shrink-0">
                                        {spaceData.data?.id ? (
                                            <Link
                                                href={`/s/${spaceData.data.id}/${encodeId(point.pinnedByCommandId)}`}
                                                onClick={(e) => {
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
                                                    onClick={handleCommandPointClick}
                                                >
                                                    Pinned by command
                                                </Button>
                                            </Link>
                                        ) : (
                                            <Button
                                                type="button"
                                                variant="link"
                                                className="h-auto p-0 text-muted-foreground hover:text-foreground"
                                                onClick={handleCommandPointClick}
                                            >
                                                Pinned by command
                                            </Button>
                                        )}
                                    </Badge>
                                )}
                                {parsePinCommand && !isPinned && isInSpecificSpace && spaceData.data?.id !== 'global' && (
                                    <Badge variant="outline" className="text-xs shrink-0">
                                        {spaceData.data?.id ? (
                                            <Link
                                                href={`/s/${spaceData.data.id}/${parsePinCommand}`}
                                                onClick={(e) => {
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
                                                    onClick={handleTargetPointClick}
                                                >
                                                    Proposal to pin
                                                </Button>
                                            </Link>
                                        ) : (
                                            <Button
                                                type="button"
                                                variant="link"
                                                className="h-auto p-0 text-muted-foreground hover:text-foreground"
                                                onClick={handleTargetPointClick}
                                            >
                                                Proposal to pin
                                            </Button>
                                        )}
                                    </Badge>
                                )}
                            </div>
                            <span className="text-muted-foreground text-sm">
                                {point?.createdAt && format(point.createdAt, "h':'mm a '·' MMM d',' yyyy")}
                            </span>

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
                                                <NegationCard
                                                    key={`${negation.pointId}-${i}`}
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
                                                    prefetchPoint={prefetchPoint}
                                                />
                                            ))
                                        }
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-muted-foreground">
                                        No negations yet. Be the first to create one!
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
                    <GraphView
                        onInit={(reactFlow) => {
                            reactFlow.addNodes(initialNodes);
                        }}
                        closeButtonClassName="md:hidden"
                        className="!fixed md:!sticky inset-0 top-[var(--header-height)] md:inset-[reset]  !h-[calc(100vh-var(--header-height))] md:top-[var(--header-height)] md: !z-10 md:z-auto"
                        rootPointId={pointId}
                        onClose={() => {
                            const newParams = new URLSearchParams(searchParams?.toString() || "");
                            newParams.delete("view"); // eslint-disable-line drizzle/enforce-delete-with-where
                            push(`?${newParams.toString()}`);
                            setCanvasEnabled(false);
                        }}
                    />
                </ReactFlowProvider>
            )}

            <NegateDialog />

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
        </main>
    );
} 