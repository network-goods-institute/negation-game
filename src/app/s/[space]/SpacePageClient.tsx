"use client";

import { negatedPointIdAtom } from "@/atoms/negatedPointIdAtom";
import { MakePointDialog } from "@/components/MakePointDialog";
import { NegateDialog } from "@/components/NegateDialog";
import { PointCard } from "@/components/PointCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { DEFAULT_SPACE } from "@/constants/config";
import { useBasePath } from "@/hooks/useBasePath";
import { encodeId } from "@/lib/encodeId";
import { preventDefaultIfContainsSelection } from "@/lib/preventDefaultIfContainsSelection";
import { useFeed } from "@/queries/useFeed";
import { useSpace } from "@/queries/useSpace";
import { usePrivy } from "@privy-io/react-auth";
import { useToggle } from "@uidotdev/usehooks";
import { useSetAtom } from "jotai";
import { PlusIcon, TrophyIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useState, useMemo, memo, useEffect } from "react";
import { LeaderboardDialog } from "@/components/LeaderboardDialog";
import { useRouter, usePathname } from "next/navigation";
import { useViewpoints } from "@/queries/useViewpoints";
import { ViewpointCard } from "@/components/ViewpointCard";
import { cn } from "@/lib/cn";
import { SearchInput } from "@/components/SearchInput";
import { useSearch } from "@/queries/useSearch";
import { SearchResultsList } from "@/components/SearchResultsList";
import { usePinnedPoint } from "@/queries/usePinnedPoint";
import { ViewpointIcon } from "@/components/icons/AppIcons";
import { usePriorityPoints } from "@/queries/usePriorityPoints";
import { decodeId } from "@/lib/decodeId";
import { useQueryClient } from "@tanstack/react-query";
import { useFavorHistory } from "@/queries/useFavorHistory";
import { usePrefetchPoint } from "@/queries/usePointData";

interface PageProps {
    params: { space: string };
    searchParams: { [key: string]: string | string[] | undefined };
}

type PointItem = {
    type: 'point';
    id: string;
    content: string;
    createdAt: Date;
    data: any;
};

type ViewpointItem = {
    type: 'rationale';
    id: string;
    content: string;
    createdAt: Date;
    data: any;
};

type FeedItem = PointItem | ViewpointItem;

const MemoizedPointCard = memo(PointCard);
const MemoizedViewpointCard = memo(ViewpointCard);

const FeedItem = memo(({ item, basePath, space, setNegatedPointId, login, user, pinnedPoint }: any) => {
    const pointId = item.type === 'point' ? item.data.pointId : null;
    const prefetchPoint = usePrefetchPoint();
    const queryClient = useQueryClient();
    const { user: privyUser } = usePrivy();
    const { data: favorHistory } = useFavorHistory(
        pointId ? {
            pointId,
            timelineScale: "1W"
        } : {
            pointId: -1, // Use a dummy ID when not a point
            timelineScale: "1W"
        }
    );

    const handlePrefetch = useCallback(() => {
        if (item.type === 'point' && item.data.pointId) {
            prefetchPoint(item.data.pointId);
            import("@/actions/fetchPointNegations").then(({ fetchPointNegations }) => {
                fetchPointNegations(item.data.pointId).then(negations => {
                    if (negations) {
                        queryClient.setQueryData(
                            [item.data.pointId, "negations", privyUser?.id],
                            negations
                        );
                    }
                });
            });
        }
    }, [item, prefetchPoint, queryClient, privyUser?.id]);

    if (item.type === 'point') {
        const point = item.data;
        const isProposalToPin = point.content?.startsWith('/pin ');
        const isPinnedPoint = pinnedPoint && pinnedPoint.pointId === point.pointId;

        // Extract target point ID if this is a pin command
        let targetPointId;
        if (isProposalToPin) {
            const parts = point.content.split(' ');
            if (parts.length > 1) {
                try {
                    targetPointId = decodeId(parts[1]);
                } catch (e) {
                    const parsedId = parseInt(parts[1], 10);
                    if (!isNaN(parsedId)) {
                        targetPointId = parsedId;
                    }
                }
            }
        }

        // Determine the pinStatus based on conditions
        let pinStatus;
        if (isProposalToPin) {
            pinStatus = targetPointId
                ? `Proposal to pin point ${targetPointId}`
                : "Proposal to pin";
        } else if (point.pinCommands?.length > 1) {
            pinStatus = `Proposal to pin (${point.pinCommands.length} proposals)`;
        } else if (point.pinCommands?.length === 1) {
            pinStatus = "Proposal to pin";
        }

        // Only use command point IDs for actual pin commands, not for targets
        const pinnedCommandPointId = isProposalToPin
            ? undefined
            : point.pinCommands?.[0]?.id;

        return (
            <Link
                draggable={false}
                onClick={preventDefaultIfContainsSelection}
                href={`${basePath}/${encodeId(point.pointId)}`}
                className="flex border-b cursor-pointer hover:bg-accent"
                onMouseEnter={handlePrefetch}
            >
                <MemoizedPointCard
                    className="flex-grow p-6"
                    amountSupporters={point.amountSupporters}
                    createdAt={point.createdAt}
                    cred={point.cred}
                    pointId={point.pointId}
                    favor={point.favor}
                    amountNegations={point.amountNegations}
                    content={point.content}
                    viewerContext={{ viewerCred: point.viewerCred }}
                    isCommand={point.isCommand}
                    isPinned={isPinnedPoint}
                    space={space}
                    onNegate={(e) => {
                        e.preventDefault();
                        if (user !== null) {
                            setNegatedPointId(point.pointId);
                        } else {
                            login();
                        }
                    }}
                    pinnedCommandPointId={pinnedCommandPointId}
                    pinStatus={pinStatus}
                    onPinBadgeClickCapture={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                    linkDisabled={true}
                    favorHistory={favorHistory as Array<{ timestamp: Date; favor: number; }> | undefined}
                />
            </Link>
        );
    } else if (item.type === 'rationale') {
        const viewpoint = item.data;

        let pointIds: number[] = viewpoint.originalPointIds || [];

        if ((!pointIds || pointIds.length === 0) && viewpoint.graph?.nodes) {
            try {
                pointIds = viewpoint.graph.nodes
                    .filter((node: any) => node.type === 'point')
                    .map((node: any) => {
                        const id = node.data?.pointId;
                        return typeof id === 'number' ? id : null;
                    })
                    .filter((id: any) => id !== null);

            } catch (error) {
            }
        }

        return (
            <Link
                draggable={false}
                href={`${basePath}/rationale/${item.id}`}
                className="flex border-b cursor-pointer hover:bg-accent"
            >
                <MemoizedViewpointCard
                    className="flex-grow p-6 w-full"
                    id={viewpoint.id}
                    title={viewpoint.title}
                    description={viewpoint.description}
                    author={viewpoint.author}
                    createdAt={viewpoint.createdAt}
                    space={space}
                    statistics={{
                        views: viewpoint.statistics?.views || 0,
                        copies: viewpoint.statistics?.copies || 0,
                        totalCred: viewpoint.statistics?.totalCred || 0,
                        averageFavor: viewpoint.statistics?.averageFavor || 0
                    }}
                />
            </Link>
        );
    }

    return null;
});
FeedItem.displayName = 'FeedItem';

const PriorityPointItem = memo(({ point, basePath, space, setNegatedPointId, login, user, pinnedPoint }: any) => {
    const prefetchPoint = usePrefetchPoint();
    const { data: favorHistory } = useFavorHistory({
        pointId: point.pointId,
        timelineScale: "1W"
    });

    const handlePrefetch = useCallback(() => {
        if (point.pointId) {
            prefetchPoint(point.pointId);
        }
    }, [point.pointId, prefetchPoint]);

    let pinStatus;
    if (point.pinCommands?.length > 1) {
        pinStatus = `Proposal to pin (${point.pinCommands.length} proposals)`;
    } else if (point.pinCommands?.length === 1) {
        pinStatus = "Proposal to pin";
    }

    // Only use command point IDs for actual pin commands
    const pinnedCommandPointId = point.pinCommands?.[0]?.id;

    return (
        <Link
            key={`priority-${point.pointId}`}
            draggable={false}
            onClick={preventDefaultIfContainsSelection}
            href={`${basePath}/${encodeId(point.pointId)}`}
            className="flex border-b cursor-pointer hover:bg-accent"
            onMouseEnter={handlePrefetch}
        >
            <MemoizedPointCard
                className="flex-grow p-6"
                amountSupporters={point.amountSupporters}
                createdAt={point.createdAt}
                cred={point.cred}
                pointId={point.pointId}
                favor={point.favor}
                amountNegations={point.amountNegations}
                content={point.content}
                viewerContext={{ viewerCred: point.viewerCred }}
                isCommand={point.isCommand}
                space={space}
                isPriority={true}
                onNegate={(e) => {
                    e.preventDefault();
                    if (user !== null) {
                        setNegatedPointId(point.pointId);
                    } else {
                        login();
                    }
                }}
                pinnedCommandPointId={pinnedCommandPointId}
                pinStatus={pinStatus}
                onPinBadgeClickCapture={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }}
                linkDisabled={true}
                favorHistory={favorHistory as Array<{ timestamp: Date; favor: number; }> | undefined}
            />
        </Link>
    );
});
PriorityPointItem.displayName = 'PriorityPointItem';

const PriorityPointsSection = memo(({ filteredPriorityPoints, basePath, space, setNegatedPointId, login, user, selectedTab, pinnedPoint }: any) => {
    if (!filteredPriorityPoints || filteredPriorityPoints.length === 0) return null;

    return (
        <div className="border-b">
            {filteredPriorityPoints.map((point: any) => (
                <PriorityPointItem
                    key={`${selectedTab}-priority-${point.pointId}`}
                    point={point}
                    basePath={basePath}
                    space={space}
                    setNegatedPointId={setNegatedPointId}
                    login={login}
                    user={user}
                    pinnedPoint={pinnedPoint}
                />
            ))}
        </div>
    );
});
PriorityPointsSection.displayName = 'PriorityPointsSection';

const AllTabContent = memo(({ points, viewpoints, isLoading, viewpointsLoading, combinedFeed, basePath, space, setNegatedPointId, login, user, pinnedPoint, loginOrMakePoint, handleNewViewpoint }: any) => {
    if (!points || !viewpoints || isLoading || viewpointsLoading) {
        return <Loader className="absolute self-center my-auto top-0 bottom-0" />;
    }

    if (points.length === 0 && viewpoints.length === 0) {
        return (
            <div className="flex flex-col flex-grow items-center justify-center gap-4 py-12 text-center min-h-[50vh]">
                <span className="text-muted-foreground">Nothing here yet</span>
                <div className="flex items-center justify-center gap-3">
                    <Button variant="outline" onClick={loginOrMakePoint}>
                        <PlusIcon className="mr-2 size-4" />
                        Make a Point
                    </Button>
                    <span className="text-muted-foreground">or</span>
                    <Button variant="outline" onClick={handleNewViewpoint}>
                        <ViewpointIcon className="mr-2.5 size-4" />
                        Create a Rationale
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <>
            {combinedFeed.map((item: FeedItem) => (
                <FeedItem
                    key={item.id}
                    item={item}
                    basePath={basePath}
                    space={space}
                    setNegatedPointId={setNegatedPointId}
                    login={login}
                    user={user}
                    pinnedPoint={pinnedPoint}
                />
            ))}
        </>
    );
});
AllTabContent.displayName = 'AllTabContent';

const PointsTabContent = memo(({ points, isLoading, combinedFeed, basePath, space, setNegatedPointId, login, user, pinnedPoint, loginOrMakePoint }: any) => {
    // Memo to avoid unnecessary recalculations of pointItems
    const pointItems = useMemo(() => {
        return combinedFeed.filter((item: FeedItem) => item.type === 'point');
    }, [combinedFeed]);

    if (isLoading) {
        return (
            <div className="flex flex-col gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="border-b py-4 px-6 min-h-[120px]">
                        <div className="animate-pulse flex flex-col w-full gap-2">
                            <div className="h-6 bg-muted rounded w-3/4"></div>
                            <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
                            <div className="h-3 bg-muted rounded w-1/4 mt-2"></div>
                            <div className="flex gap-2 mt-2">
                                <div className="h-5 w-5 bg-muted rounded-full"></div>
                                <div className="h-5 w-5 bg-muted rounded-full"></div>
                                <div className="h-5 w-5 bg-muted rounded-full"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (points?.length === 0 && !pinnedPoint && pointItems.length === 0) {
        return (
            <div className="flex flex-col flex-grow items-center justify-center gap-4 py-12 text-center min-h-[50vh]">
                <span className="text-muted-foreground">Nothing here yet</span>
                <Button variant="outline" onClick={loginOrMakePoint}>
                    <PlusIcon className="mr-2 size-4" />
                    Make a Point
                </Button>
            </div>
        );
    }

    return (
        <>
            {pointItems.map((item: FeedItem) => (
                <FeedItem
                    key={item.id}
                    item={item}
                    basePath={basePath}
                    space={space}
                    setNegatedPointId={setNegatedPointId}
                    login={login}
                    user={user}
                    pinnedPoint={pinnedPoint}
                />
            ))}
        </>
    );
});
PointsTabContent.displayName = 'PointsTabContent';

const RationalesTabContent = memo(({ viewpoints, viewpointsLoading, basePath, space, handleNewViewpoint }: any) => {
    useEffect(() => {
        if (viewpoints && viewpoints.length > 0) {

            const sample = viewpoints[0];
            if (sample.graph && sample.graph.nodes) {
                sample.graph.nodes
                    .filter((node: any) => node.type === 'point')
                    .map((node: any) => node.data?.pointId)
            }
        }
    }, [viewpoints]);

    if (viewpoints === undefined || viewpointsLoading) {
        return <Loader className="absolute self-center my-auto top-0 bottom-0" />;
    }

    if (viewpoints.length === 0) {
        return (
            <div className="flex flex-col flex-grow items-center justify-center gap-4 py-12 text-center min-h-[50vh]">
                <span className="text-muted-foreground">Nothing here yet</span>
                <Button variant="outline" onClick={handleNewViewpoint}>
                    <ViewpointIcon className="mr-2.5 size-4" />
                    Create a Rationale
                </Button>
            </div>
        );
    }

    return (
        viewpoints.map((viewpoint: any) => {

            let pointIds: number[] = viewpoint.originalPointIds || [];

            if ((!pointIds || pointIds.length === 0) && viewpoint.graph?.nodes) {
                try {
                    pointIds = viewpoint.graph.nodes
                        .filter((node: any) => node.type === 'point')
                        .map((node: any) => {

                            const id = node.data?.pointId;
                            return typeof id === 'number' ? id : null;
                        })
                        .filter((id: any) => id !== null);

                } catch (error) {
                }
            }

            return (
                <ViewpointCard
                    key={`rationales-tab-${viewpoint.id}`}
                    id={viewpoint.id}
                    title={viewpoint.title}
                    description={viewpoint.description}
                    author={viewpoint.author}
                    createdAt={new Date(viewpoint.createdAt)}
                    space={space || "global"}
                    statistics={{
                        views: viewpoint.statistics?.views || 0,
                        copies: viewpoint.statistics?.copies || 0,
                        totalCred: viewpoint.statistics?.totalCred || 0,
                        averageFavor: viewpoint.statistics?.averageFavor || 0
                    }}
                    linkable={true}
                />
            );
        })
    );
});
RationalesTabContent.displayName = 'RationalesTabContent';

const PinnedPointWithHistory = memo(({ pinnedPoint, space }: any) => {
    const { data: favorHistory } = useFavorHistory({
        pointId: pinnedPoint.pointId,
        timelineScale: "1W"
    });

    return (
        <PointCard
            className="flex-grow p-6"
            amountSupporters={pinnedPoint.amountSupporters}
            createdAt={pinnedPoint.createdAt}
            cred={pinnedPoint.cred}
            pointId={pinnedPoint.pointId}
            favor={pinnedPoint.favor}
            amountNegations={pinnedPoint.amountNegations}
            content={pinnedPoint.content}
            viewerContext={{ viewerCred: pinnedPoint.viewerCred }}
            isPinned={true}
            isCommand={pinnedPoint.isCommand}
            space={space}
            pinnedCommandPointId={pinnedPoint.pinCommands?.[0]?.id}
            onPinBadgeClickCapture={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
            pinStatus={
                pinnedPoint.pinCommands?.length > 1
                    ? `Pinned by command (${pinnedPoint.pinCommands.length} competing proposals)`
                    : pinnedPoint.pinCommands?.length === 1
                        ? "Pinned by command"
                        : "Pinned by command"
            }
            linkDisabled={true}
            favorHistory={favorHistory as Array<{ timestamp: Date; favor: number; }> | undefined}
        />
    );
});
PinnedPointWithHistory.displayName = 'PinnedPointWithHistory';

export function SpacePageClient({
    params,
    searchParams: initialSearchParams,
}: PageProps) {
    const { user, login } = usePrivy();
    const [makePointOpen, onMakePointOpenChange] = useToggle(false);
    const basePath = useBasePath();
    const space = useSpace(params.space);
    const [leaderboardOpen, setLeaderboardOpen] = useState(false);
    const router = useRouter();
    const queryClient = useQueryClient();
    const [isNavigating, setIsNavigating] = useState(false);
    const { data: viewpoints, isLoading: viewpointsLoading } = useViewpoints(space.data?.id || "global");
    const [selectedTab, setSelectedTab] = useState<"all" | "points" | "rationales" | "search">("rationales");
    const { searchQuery, searchResults, isLoading: searchLoading, handleSearch, isActive, hasSearched } = useSearch();

    // Prevent feed from reloading when navigating back to it
    useEffect(() => {
        // Only prevent refetching if we're not actively using the feed
        // This allows mutations like endorsements to trigger refetches
        if (user?.id && isNavigating) {
            queryClient.setQueryData(["feed", user?.id], (oldData: any) => oldData);
        }
    }, [queryClient, user?.id, isNavigating]);

    // We'll always load priority points now
    const {
        data: priorityPoints,
        isLoading: priorityPointsLoading
    } = usePriorityPoints();

    // Only load pinned point for non-global spaces
    const shouldLoadPinnedPoint = space.data?.id !== "global";

    const { data: pinnedPoint, isLoading: pinnedPointLoading } = usePinnedPoint(
        shouldLoadPinnedPoint ? space.data?.id : undefined
    );

    const handleNewViewpoint = () => {
        if (user) {
            setIsNavigating(true);
            router.push(`${basePath}/rationale/new`);
        } else {
            login();
        }
    };

    const { data: points, isLoading } = useFeed();
    const setNegatedPointId = useSetAtom(negatedPointIdAtom);

    const pathname = usePathname();
    const isInSpecificSpace = pathname?.includes('/s/') && !pathname.match(/^\/s\/global\//);

    const loginOrMakePoint = useCallback(() => {
        if (user !== null) {
            onMakePointOpenChange(true);
        } else {
            login();
        }
    }, [user, login, onMakePointOpenChange]);

    // Filter priority points to remove duplicates with pinnedPoint - with memoization
    const filteredPriorityPoints = useMemo(() => {
        if (!priorityPoints || priorityPointsLoading) return [];

        // First remove any duplicate points within priority points itself
        const uniquePriorityPoints = Array.from(
            new Map(priorityPoints.map(point => [point.pointId, point])).values()
        );

        // Then filter out the pinned point if it exists
        return uniquePriorityPoints.filter(point => {
            return !pinnedPoint || point.pointId !== pinnedPoint.pointId;
        });
    }, [priorityPoints, pinnedPoint, priorityPointsLoading]);

    // Add all pin command target points to the exclusion list
    const pinnedAndPriorityPoints = useMemo(() => {
        const pointIds = new Set<number>();

        // Add priority points IDs
        if (filteredPriorityPoints?.length) {
            filteredPriorityPoints.forEach(point => pointIds.add(point.pointId));
        }

        // Add pinned point ID - this is the only one we should filter out
        if (pinnedPoint?.pointId) {
            pointIds.add(pinnedPoint.pointId);
        }


        return pointIds;
    }, [filteredPriorityPoints, pinnedPoint]);

    // Optimize the combinedFeed logic to be more efficient
    const combinedFeed = useMemo(() => {
        if (!points) {
            return [];
        }
        const allItems: FeedItem[] = [];

        const includePoints = selectedTab !== "rationales";
        const includeRationales = selectedTab === "all" || selectedTab === "rationales";

        // Add points when needed
        if (includePoints) {
            // Add all points to the feed, except those in pinnedAndPriorityPoints
            points
                .filter(point => !pinnedAndPriorityPoints.has(point.pointId))
                .forEach(point => {
                    allItems.push({
                        type: 'point',
                        id: `point-${point.pointId}`,
                        content: point.content,
                        createdAt: point.createdAt,
                        data: point,
                    });
                });
        }

        // Add rationales when needed
        if (includeRationales && viewpoints) {
            viewpoints.forEach(viewpoint => {
                allItems.push({
                    type: 'rationale',
                    id: viewpoint.id,
                    content: viewpoint.title,
                    createdAt: viewpoint.createdAt,
                    data: viewpoint,
                });
            });
        }

        return allItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }, [points, viewpoints, pinnedAndPriorityPoints, selectedTab]);

    // Handle search input change
    const handleSearchChange = (value: string) => {
        handleSearch(value);
        if (value.trim().length > 0 && selectedTab !== "search") {
            setSelectedTab("search");
        }
    };

    // Handler to navigate to the pinned point
    const handlePinnedPointClick = (e: React.MouseEvent, encodedId: string) => {
        preventDefaultIfContainsSelection(e);
        router.push(`${basePath}/${encodedId}`);
    };

    return (
        <main className="sm:grid sm:grid-cols-[1fr_minmax(200px,600px)_1fr] flex-grow bg-background">
            <div className="relative w-full sm:col-[2] flex flex-col gap-0 border-x overflow-auto">
                {space && space.data && space.data.id !== DEFAULT_SPACE && (
                    <>
                        <div className="absolute top-0 h-10 w-full bg-muted" />
                        <div className="py-sm px-lg flex items-end gap-sm w-full border-b pb-2xl">
                            <Avatar className="border-4 border-background h-20 w-20">
                                {space.data.icon && (
                                    <AvatarImage
                                        src={space.data.icon}
                                        alt={`s/${space.data.id} icon`}
                                    />
                                )}
                                <AvatarFallback className="text-4xl font-bold text-muted-foreground">
                                    {space.data.id.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <h1 className="text-xl mb-md font-semibold">s/{space.data.id}</h1>
                        </div>
                    </>
                )}

                <div className="flex flex-col gap-4 px-lg py-sm border-b">
                    <div className="flex gap-4">
                        <button
                            onClick={() => setSelectedTab("rationales")}
                            className={cn(
                                "py-2 px-4 rounded focus:outline-none",
                                selectedTab === "rationales" ? "bg-primary text-white" : "bg-transparent text-primary"
                            )}
                        >
                            Rationales
                        </button>
                        <button
                            onClick={() => setSelectedTab("points")}
                            className={cn(
                                "py-2 px-4 rounded focus:outline-none",
                                selectedTab === "points" ? "bg-primary text-white" : "bg-transparent text-primary"
                            )}
                        >
                            Points
                        </button>
                        <button
                            onClick={() => setSelectedTab("all")}
                            className={cn(
                                "py-2 px-4 rounded focus:outline-none",
                                selectedTab === "all" ? "bg-primary text-white" : "bg-transparent text-primary"
                            )}
                        >
                            All
                        </button>
                        <button
                            onClick={() => {
                                setSelectedTab("search");
                                // Focus the search input when clicking the search tab
                                setTimeout(() => {
                                    const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
                                    if (searchInput) searchInput.focus();
                                }, 0);
                            }}
                            className={cn(
                                "py-2 px-4 rounded focus:outline-none flex items-center gap-1",
                                selectedTab === "search" ? "bg-primary text-white" : "bg-transparent text-primary"
                            )}
                        >
                            <SearchIcon className="h-4 w-4" />
                            <span>Search</span>
                        </button>
                    </div>

                    {selectedTab === "search" && (
                        <div className="pb-2">
                            <SearchInput
                                value={searchQuery}
                                onChange={handleSearchChange}
                                placeholder="Search points, rationales, or authors..."
                            />
                        </div>
                    )}
                </div>

                {/* Pinned Point - with transition */}
                {selectedTab !== "search" && selectedTab !== "rationales" &&
                    pinnedPoint && !pinnedPointLoading && isInSpecificSpace && (
                        <div className="border-b transition-opacity duration-200 ease-in-out">
                            <Link
                                draggable={false}
                                onClick={preventDefaultIfContainsSelection}
                                href={`${basePath}/${encodeId(pinnedPoint.pointId)}`}
                                className="flex cursor-pointer hover:bg-accent"
                            >
                                <PinnedPointWithHistory
                                    pinnedPoint={pinnedPoint}
                                    space={space.data?.id}
                                />
                            </Link>
                        </div>
                    )}

                {/* Priority Points - with transition */}
                {selectedTab !== "search" && selectedTab !== "rationales" &&
                    (priorityPointsLoading ? (
                        <div className="border-b py-4 px-6 min-h-[120px] flex items-center justify-center">
                            <div className="animate-pulse flex flex-col w-full gap-2">
                                <div className="h-6 bg-muted rounded w-3/4"></div>
                                <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
                                <div className="h-3 bg-muted rounded w-1/4 mt-2"></div>
                                <div className="flex gap-2 mt-2">
                                    <div className="h-5 w-5 bg-muted rounded-full"></div>
                                    <div className="h-5 w-5 bg-muted rounded-full"></div>
                                    <div className="h-5 w-5 bg-muted rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    ) : filteredPriorityPoints.length > 0 ? (
                        <div className="border-b transition-opacity duration-200 ease-in-out">
                            <PriorityPointsSection
                                filteredPriorityPoints={filteredPriorityPoints}
                                basePath={basePath}
                                space={space.data?.id}
                                setNegatedPointId={setNegatedPointId}
                                login={login}
                                user={user}
                                selectedTab={selectedTab}
                                pinnedPoint={pinnedPoint}
                            />
                        </div>
                    ) : null)}

                {selectedTab === "search" ? (
                    <SearchResultsList
                        results={searchResults}
                        isLoading={searchLoading}
                        query={searchQuery}
                        hasSearched={hasSearched}
                    />
                ) : selectedTab === "all" ? (
                    <AllTabContent
                        points={points}
                        viewpoints={viewpoints}
                        isLoading={isLoading}
                        viewpointsLoading={viewpointsLoading}
                        combinedFeed={combinedFeed}
                        basePath={basePath}
                        space={space.data?.id}
                        setNegatedPointId={setNegatedPointId}
                        login={login}
                        user={user}
                        pinnedPoint={pinnedPoint}
                        loginOrMakePoint={loginOrMakePoint}
                        handleNewViewpoint={handleNewViewpoint}
                    />
                ) : selectedTab === "points" ? (
                    <PointsTabContent
                        points={points}
                        isLoading={isLoading}
                        combinedFeed={combinedFeed}
                        basePath={basePath}
                        space={space.data?.id}
                        setNegatedPointId={setNegatedPointId}
                        login={login}
                        user={user}
                        pinnedPoint={pinnedPoint}
                        loginOrMakePoint={loginOrMakePoint}
                    />
                ) : (
                    <RationalesTabContent
                        viewpoints={viewpoints}
                        viewpointsLoading={viewpointsLoading}
                        basePath={basePath}
                        space={space.data?.id}
                        handleNewViewpoint={handleNewViewpoint}
                    />
                )}
            </div>
            <div className="fixed bottom-md right-sm sm:right-md flex flex-col items-end gap-3">
                <Button
                    className="aspect-square rounded-full h-[58px] w-[58px] sm:h-10 sm:w-[160px] order-3"
                    onClick={loginOrMakePoint}
                    disabled={makePointOpen}
                >
                    <PlusIcon className="size-7 sm:size-5" />
                    <span className="hidden sm:block ml-sm">Make a Point</span>
                </Button>

                <Button
                    className="aspect-square rounded-full h-[58px] w-[58px] sm:h-10 sm:w-[160px] order-2"
                    onClick={handleNewViewpoint}
                    rightLoading={isNavigating}
                >
                    {isNavigating ? (
                        <>
                            <span className="hidden sm:block">Creating...</span>
                            <Loader className="sm:hidden size-5 text-primary mx-auto" />
                        </>
                    ) : (
                        <>
                            <ViewpointIcon />
                            <span className="hidden sm:block ml-sm">New Rationale</span>
                        </>
                    )}
                </Button>

                <Button
                    variant="ghost"
                    className="aspect-square rounded-full h-[58px] w-[58px] sm:h-10 sm:w-auto sm:px-6 order-1"
                    onClick={() => setLeaderboardOpen(true)}
                >
                    <TrophyIcon className="size-7 sm:size-5" />
                    <span className="hidden sm:block ml-sm">Leaderboard</span>
                </Button>
            </div>

            <NegateDialog />
            <MakePointDialog
                open={makePointOpen}
                onOpenChange={onMakePointOpenChange}
            />
            <LeaderboardDialog
                open={leaderboardOpen}
                onOpenChange={setLeaderboardOpen}
                space={space.data?.id || "global"}
            />
        </main>
    );
} 