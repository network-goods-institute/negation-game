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
import { useSetAtom, useAtom } from "jotai";
import { PlusIcon, TrophyIcon, SearchIcon, BrainCircuitIcon, ShareIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useState, useMemo, memo, useEffect, useRef } from "react";
import { LeaderboardDialog } from "@/components/LeaderboardDialog";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useViewpoints } from "@/queries/useViewpoints";
import { cn } from "@/lib/cn";
import { SearchInput } from "@/components/SearchInput";
import { useSearch } from "@/queries/useSearch";
import { SearchResultsList } from "@/components/SearchResultsList";
import { usePinnedPoint } from "@/queries/usePinnedPoint";
import { ViewpointIcon } from "@/components/icons/AppIcons";
import { usePriorityPoints } from "@/queries/usePriorityPoints";
import { decodeId } from "@/lib/decodeId";
import { useQueryClient } from "@tanstack/react-query";
import { usePrefetchPoint } from "@/queries/usePointData";
import React from "react";
import { ViewpointCardWrapper } from "@/components/ViewpointCardWrapper";
import { initialSpaceTabAtom } from "@/atoms/navigationAtom";
import { SharePointsDialog } from "@/components/SharePointsDialog";

interface PageProps {
    params: { space: string };
    searchParams?: { [key: string]: string | string[] | undefined };
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

type Tab = "all" | "points" | "rationales" | "search";

const MemoizedPointCard = memo(PointCard);
const MemoizedViewpointCardWrapper = memo(ViewpointCardWrapper);

const FeedItem = memo(({ item, basePath, space, setNegatedPointId, login, user, pinnedPoint, handleCardClick, loadingCardId }: {
    item: FeedItem;
    basePath: string;
    space: string;
    setNegatedPointId: (id: number) => void;
    login: () => void;
    user: any;
    pinnedPoint: any;
    handleCardClick: (id: string) => void;
    loadingCardId: string | null;
}) => {
    const pointId = item.type === 'point' ? item.data.pointId : null;
    const prefetchPoint = usePrefetchPoint();
    const queryClient = useQueryClient();
    const [hasStartedLoading, setHasStartedLoading] = useState(false);
    const favorHistoryKey = useMemo(() => pointId ? [pointId, "favor-history", "1W"] : null, [pointId]);

    // Debounce hover to prevent excessive requests on quick mouse movements
    const handleHover = useCallback(() => {
        if (!pointId || !favorHistoryKey || hasStartedLoading) return;

        setHasStartedLoading(true);

        const existingData = queryClient.getQueryData(favorHistoryKey);
        if (existingData) {
            return;
        }

        prefetchPoint(pointId);

        import("@/actions/fetchFavorHistory")
            .then(({ fetchFavorHistory }) => {
                return fetchFavorHistory({ pointId, scale: "1W" });
            })
            .then(data => {
                if (data) {
                    queryClient.setQueryData(favorHistoryKey, data);
                }
            })
            .catch(error => {
                if (process.env.NODE_ENV === "development") {
                    console.warn(`[FeedItem] Failed to fetch favor history for ${pointId}:`, error);
                }
            });
    }, [pointId, favorHistoryKey, hasStartedLoading, prefetchPoint, queryClient]);

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
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                    preventDefaultIfContainsSelection(e);
                    // Don't navigate if text is selected or if it's an action button
                    const isActionButton = (e.target as HTMLElement).closest('[data-action-button="true"]');
                    if (!isActionButton && window.getSelection()?.isCollapsed !== false) {
                        prefetchPoint(point.pointId);
                        handleCardClick(`point-${point.pointId}`);
                    }
                }}
                href={`${basePath}/${encodeId(point.pointId)}`}
                className="flex border-b cursor-pointer hover:bg-accent"
                onMouseEnter={handleHover}
            >
                <MemoizedPointCard
                    onNegate={(e) => {
                        e.preventDefault();
                        if (user !== null) {
                            setNegatedPointId(point.pointId);
                        } else {
                            login();
                        }
                    }}
                    className="flex-grow p-6"
                    favor={point.favor}
                    content={point.content}
                    createdAt={point.createdAt}
                    amountSupporters={point.amountSupporters}
                    amountNegations={point.amountNegations}
                    pointId={point.pointId}
                    cred={point.cred}
                    viewerContext={{ viewerCred: point.viewerCred }}
                    isCommand={point.isCommand}
                    isPinned={isPinnedPoint}
                    space={space || "global"}
                    pinnedCommandPointId={pinnedCommandPointId}
                    pinStatus={pinStatus}
                    onPinBadgeClickCapture={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                    linkDisabled={true}
                    disablePopover={true}
                    isLoading={loadingCardId === `point-${point.pointId}`}
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
            <MemoizedViewpointCardWrapper
                key={`rationale-${item.id}`}
                id={viewpoint.id}
                title={viewpoint.title}
                description={viewpoint.description}
                author={viewpoint.author}
                createdAt={viewpoint.createdAt}
                space={space || "global"}
                statistics={{
                    views: viewpoint.statistics?.views || 0,
                    copies: viewpoint.statistics?.copies || 0,
                    totalCred: viewpoint.statistics?.totalCred || 0,
                    averageFavor: viewpoint.statistics?.averageFavor || 0
                }}
                loadingCardId={loadingCardId}
                handleCardClick={handleCardClick}
            />
        );
    }

    return null;
});
FeedItem.displayName = 'FeedItem';

const PriorityPointItem = memo(({ point, basePath, space, setNegatedPointId, login, user, pinnedPoint, loadingCardId, handleCardClick }: any) => {
    const prefetchPoint = usePrefetchPoint();
    const [hasStartedLoading, setHasStartedLoading] = useState(false);
    const queryClient = useQueryClient();
    const favorHistoryKey = useMemo(() => [point.pointId, "favor-history", "1W"], [point.pointId]);

    const handlePrefetch = useCallback(() => {
        if (!point.pointId || hasStartedLoading) return;

        setHasStartedLoading(true);

        const existingData = queryClient.getQueryData(favorHistoryKey);
        if (existingData) {
            return;
        }

        prefetchPoint(point.pointId);

        import("@/actions/fetchFavorHistory")
            .then(({ fetchFavorHistory }) => {
                return fetchFavorHistory({
                    pointId: point.pointId,
                    scale: "1W"
                });
            })
            .then(data => {
                if (data) {
                    queryClient.setQueryData(favorHistoryKey, data);
                }
            })
            .catch(error => {
                if (process.env.NODE_ENV === "development") {
                    console.warn(`[PriorityPointItem] Failed to fetch favor history for ${point.pointId}:`, error);
                }
            });
    }, [point.pointId, prefetchPoint, hasStartedLoading, queryClient, favorHistoryKey]);

    let pinStatus;
    if (point.pinCommands?.length > 1) {
        pinStatus = `Proposal to pin (${point.pinCommands.length} proposals)`;
    } else if (point.pinCommands?.length === 1) {
        pinStatus = "Proposal to pin";
    }

    // Only use command point IDs for actual pin commands
    const pinnedCommandPointId = point.pinCommands?.[0]?.id;

    return (
        <div className="relative">
            <Link
                key={`priority-${point.pointId}`}
                draggable={false}
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                    preventDefaultIfContainsSelection(e);
                    // Don't navigate if text is selected or if it's an action button
                    const isActionButton = (e.target as HTMLElement).closest('[data-action-button="true"]');
                    if (!isActionButton && window.getSelection()?.isCollapsed !== false) {
                        handleCardClick(`point-${point.pointId}`);
                    }
                }}
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
                    isLoading={loadingCardId === `point-${point.pointId}`}
                />
            </Link>
        </div>
    );
});
PriorityPointItem.displayName = 'PriorityPointItem';

const PriorityPointsSection = memo(({ filteredPriorityPoints, basePath, space, setNegatedPointId, login, user, selectedTab, pinnedPoint, loadingCardId, handleCardClick }: any) => {
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
                    loadingCardId={loadingCardId}
                    handleCardClick={handleCardClick}
                />
            ))}
        </div>
    );
});
PriorityPointsSection.displayName = 'PriorityPointsSection';

const AllTabContent = memo(({ points, viewpoints, isLoading, viewpointsLoading, combinedFeed, basePath, space, setNegatedPointId, login, user, pinnedPoint, loginOrMakePoint, handleNewViewpoint, handleCardClick, loadingCardId }: {
    points: any[] | undefined;
    viewpoints: any[] | undefined;
    isLoading: boolean;
    viewpointsLoading: boolean;
    combinedFeed: FeedItem[];
    basePath: string;
    space: string;
    setNegatedPointId: (id: number) => void;
    login: () => void;
    user: any;
    pinnedPoint: any;
    loginOrMakePoint: () => void;
    handleNewViewpoint: () => void;
    handleCardClick: (id: string) => void;
    loadingCardId: string | null;
}) => {
    if (!points || !viewpoints || isLoading || viewpointsLoading) {
        return <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-200px)]">
            <Loader className="h-6 w-6" />
        </div>;
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
                    handleCardClick={handleCardClick}
                    loadingCardId={loadingCardId}
                />
            ))}
        </>
    );
});
AllTabContent.displayName = 'AllTabContent';

const PointsTabContent = memo(({ points, isLoading, combinedFeed, basePath, space, setNegatedPointId, login, user, pinnedPoint, loginOrMakePoint, handleCardClick, loadingCardId }: {
    points: any[] | undefined;
    isLoading: boolean;
    combinedFeed: FeedItem[];
    basePath: string;
    space: string;
    setNegatedPointId: (id: number) => void;
    login: () => void;
    user: any;
    pinnedPoint: any;
    loginOrMakePoint: () => void;
    handleCardClick: (id: string) => void;
    loadingCardId: string | null;
}) => {
    // Memo to avoid unnecessary recalculations of pointItems
    const pointItems = useMemo(() => {
        return combinedFeed.filter((item: FeedItem) => item.type === 'point');
    }, [combinedFeed]);

    if (isLoading) {
        return <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-200px)]">
            <Loader className="h-6 w-6" />
        </div>;
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
                    handleCardClick={handleCardClick}
                    loadingCardId={loadingCardId}
                />
            ))}
        </>
    );
});
PointsTabContent.displayName = 'PointsTabContent';

const RationalesTabContent = memo(({ viewpoints, viewpointsLoading, basePath, space, handleNewViewpoint, handleCardClick, loadingCardId }: any) => {
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
        return <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-200px)]">
            <Loader className="h-6 w-6" />
        </div>;
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
        <div className="flex flex-col">
            {viewpoints.map((viewpoint: any) => {
                return (
                    <ViewpointCardWrapper
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
                        loadingCardId={loadingCardId}
                        handleCardClick={handleCardClick}
                    />
                );
            })}
        </div>
    );
});
RationalesTabContent.displayName = 'RationalesTabContent';

const PinnedPointWithHistory = memo(({ pinnedPoint, space, loadingCardId }: any) => {
    const [hasStartedLoading, setHasStartedLoading] = useState(false);
    const queryClient = useQueryClient();
    const favorHistoryKey = useMemo(() => [pinnedPoint.pointId, "favor-history", "1W"], [pinnedPoint.pointId]);

    useEffect(() => {
        if (!pinnedPoint.pointId || hasStartedLoading) return;

        setHasStartedLoading(true);


        const existingData = queryClient.getQueryData(favorHistoryKey);
        if (existingData) {
            return;
        }
        import("@/actions/fetchFavorHistory")
            .then(({ fetchFavorHistory }) => {
                return fetchFavorHistory({
                    pointId: pinnedPoint.pointId,
                    scale: "1W"
                });
            })
            .then(data => {
                if (data) {
                    queryClient.setQueryData(favorHistoryKey, data);
                }
            })
            .catch(error => {
            });
    }, [pinnedPoint.pointId, hasStartedLoading, queryClient, favorHistoryKey]);

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
            isLoading={loadingCardId === `point-${pinnedPoint.pointId}`}
        />
    );
});
PinnedPointWithHistory.displayName = 'PinnedPointWithHistory';

export function SpacePageClient({ params, searchParams: pageSearchParams }: PageProps) {
    const { user: privyUser, login } = usePrivy();
    const [makePointOpen, onMakePointOpenChange] = useToggle(false);
    const basePath = useBasePath();
    const space = useSpace(params.space);
    const [leaderboardOpen, setLeaderboardOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const [isNavigating, setIsNavigating] = useState(false);
    const [initialTabFromAtom, setInitialTabAtom] = useAtom(initialSpaceTabAtom);
    const queryClient = useQueryClient();
    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    const searchParams = useSearchParams();
    const isSharedView = searchParams?.get('view') === 'shared';
    const sharedPointsStr = searchParams?.get('points') || undefined;
    const sharedPoints = sharedPointsStr ? sharedPointsStr.split(',').map(Number).filter(Boolean) : [];
    const sharedBy = searchParams?.get('by') || undefined;

    const lastTabViewTimes = useRef<Record<string, number>>({
        rationales: 0,
        points: 0,
        all: 0,
        search: 0
    });

    const { data: viewpoints, isLoading: viewpointsLoading } = useViewpoints(space.data?.id || "global");

    const [selectedTab, setSelectedTab] = useState<Tab | null>(null);


    useEffect(() => {
        if (selectedTab === null && initialTabFromAtom) {
            setSelectedTab(initialTabFromAtom);
            setInitialTabAtom(null); // Reset after use
        } else if (selectedTab === null && !initialTabFromAtom) {
            setSelectedTab("rationales");
        }
    }, [initialTabFromAtom, selectedTab, setInitialTabAtom]);

    const { searchQuery, searchResults, isLoading: searchLoading, handleSearch, isActive, hasSearched } = useSearch();
    const [loadingCardId, setLoadingCardId] = useState<string | null>(null);

    const handleCardClick = useCallback((id: string) => {
        setLoadingCardId(id);
    }, []);

    useEffect(() => {
        setLoadingCardId(null);
        return () => {
            setLoadingCardId(null);
        };
    }, [pathname]);

    // Prevent feed from reloading when navigating back to it
    useEffect(() => {
        // Only prevent refetching if we're not actively using the feed
        // This allows mutations like endorsements to trigger refetches
        if (privyUser?.id && isNavigating) {
            queryClient.setQueryData(["feed", privyUser?.id], (oldData: any) => oldData);
        }
    }, [queryClient, privyUser?.id, isNavigating]);

    // Only load feed data when "all" tab is selected
    const { data: points, isLoading } = useFeed();

    // We'll always load priority points now, but avoid triggering stale-time refreshes too often
    const {
        data: priorityPoints,
        isLoading: priorityPointsLoading
    } = usePriorityPoints();

    // Only load pinned point for non-global spaces
    const shouldLoadPinnedPoint = space.data?.id !== "global";

    const { data: pinnedPoint, isLoading: pinnedPointLoading } = usePinnedPoint(
        shouldLoadPinnedPoint ? space.data?.id : undefined
    );

    const handleTabChange = useCallback((tab: Tab) => {
        setSelectedTab(tab);

        if (lastTabViewTimes.current) {
            lastTabViewTimes.current[tab] = Date.now();
        }

        if (tab === "search") {
            setTimeout(() => {
                const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
                if (searchInput) searchInput.focus();
            }, 0);
        }
    }, []);

    const handleNewViewpoint = () => {
        if (privyUser) {
            setIsNavigating(true);
            router.push(`${basePath}/rationale/new`);
        } else {
            login();
        }
    };

    const setNegatedPointId = useSetAtom(negatedPointIdAtom);

    const isInSpecificSpace = pathname?.includes('/s/') && !pathname.match(/^\/s\/global\//);

    const loginOrMakePoint = useCallback(() => {
        if (privyUser !== null) {
            onMakePointOpenChange(true);
        } else {
            login();
        }
    }, [privyUser, login, onMakePointOpenChange]);

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
        if (includePoints && Array.isArray(points)) {
            // Add all points to the feed, except those in pinnedAndPriorityPoints
            points
                .filter((point: any) => !pinnedAndPriorityPoints.has(point.pointId))
                .forEach((point: any) => {
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

    if (selectedTab === null) {
        return (
            <main className="sm:grid sm:grid-cols-[1fr_minmax(200px,600px)_1fr] flex-grow bg-background">
                <div className="relative w-full sm:col-[2] flex flex-col gap-0 border-x overflow-auto">
                    <Loader className="absolute self-center my-auto top-0 bottom-0" />
                </div>
            </main>
        );
    }

    return (
        <main className="sm:grid sm:grid-cols-[1fr_minmax(200px,600px)_1fr] flex-grow bg-background">
            <div className="relative w-full sm:col-[2] flex flex-col gap-0 border-x overflow-auto">
                {space && space.data && space.data.id !== DEFAULT_SPACE && (
                    <div className="py-3 px-4 flex items-center justify-between gap-3 w-full border-b">
                        <div className="flex items-center gap-3">
                            <Avatar className="border-2 sm:border-4 border-background h-12 w-12 sm:h-20 sm:w-20">
                                {space.data.icon && (
                                    <AvatarImage
                                        src={space.data.icon}
                                        alt={`s/${space.data.id} icon`}
                                    />
                                )}
                                <AvatarFallback className="text-2xl sm:text-4xl font-bold text-muted-foreground">
                                    {space.data.id.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <h1 className="text-lg sm:text-xl font-semibold">s/{space.data.id}</h1>
                        </div>
                        <Button
                            className="h-12 w-auto px-6"
                            onClick={() => router.push(`${basePath}/chat`)}
                        >
                            <BrainCircuitIcon className="size-6" />
                            <span className="ml-sm">AI Assistant</span>
                        </Button>
                    </div>
                )}

                <div className="flex flex-col gap-4 px-4 sm:px-lg py-3 sm:py-sm border-b">
                    <div className="flex gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => {
                                handleTabChange("rationales");
                            }}
                            className={cn(
                                "py-1.5 sm:py-2 px-3 sm:px-4 rounded text-sm sm:text-base whitespace-nowrap focus:outline-none",
                                selectedTab === "rationales" ? "bg-primary text-white" : "bg-transparent text-primary"
                            )}
                        >
                            Rationales
                        </button>
                        <button
                            onClick={() => {
                                handleTabChange("points");
                            }}
                            className={cn(
                                "py-1.5 sm:py-2 px-3 sm:px-4 rounded text-sm sm:text-base whitespace-nowrap focus:outline-none",
                                selectedTab === "points" ? "bg-primary text-white" : "bg-transparent text-primary"
                            )}
                        >
                            Points
                        </button>
                        <button
                            onClick={() => {
                                handleTabChange("all");
                            }}
                            className={cn(
                                "py-1.5 sm:py-2 px-3 sm:px-4 rounded text-sm sm:text-base whitespace-nowrap focus:outline-none",
                                selectedTab === "all" ? "bg-primary text-white" : "bg-transparent text-primary"
                            )}
                        >
                            All
                        </button>
                        <button
                            onClick={() => {
                                handleTabChange("search");
                            }}
                            className={cn(
                                "py-1.5 sm:py-2 px-3 sm:px-4 rounded text-sm sm:text-base whitespace-nowrap focus:outline-none flex items-center gap-1",
                                selectedTab === "search" ? "bg-primary text-white" : "bg-transparent text-primary"
                            )}
                        >
                            <SearchIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span>Search</span>
                        </button>
                        {space?.data?.id === DEFAULT_SPACE && (
                            <Button
                                className="ml-auto py-1.5 sm:py-2 px-2 sm:px-4 text-xs sm:text-sm flex items-center gap-1"
                                variant="ghost"
                                onClick={() => router.push(`${basePath}/chat`)}
                            >
                                <BrainCircuitIcon className="size-3.5 sm:size-4" />
                                <span className="hidden sm:inline">AI Assistant</span>
                            </Button>
                        )}
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

                {/* Loading State */}
                {selectedTab === null && (
                    <div className="flex items-center justify-center flex-1 min-h-[50vh]">
                        <Loader className="h-6 w-6" />
                    </div>
                )}

                {/* Pinned Point - with transition */}
                {selectedTab !== "search" && selectedTab !== "rationales" &&
                    pinnedPoint && !pinnedPointLoading && isInSpecificSpace && (
                        <div className="border-b transition-opacity duration-200 ease-in-out">
                            <Link
                                draggable={false}
                                onClick={(e: React.MouseEvent) => {
                                    preventDefaultIfContainsSelection(e);
                                    const isActionButton = (e.target as HTMLElement).closest('[data-action-button="true"]');
                                    if (!isActionButton && window.getSelection()?.isCollapsed !== false) {
                                        handleCardClick(`point-${pinnedPoint.pointId}`);
                                    }
                                }}
                                href={`${basePath}/${encodeId(pinnedPoint.pointId)}`}
                                className="flex cursor-pointer hover:bg-accent"
                            >
                                <PinnedPointWithHistory
                                    pinnedPoint={pinnedPoint}
                                    space={space.data?.id}
                                    loadingCardId={loadingCardId}
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
                                user={privyUser}
                                selectedTab={selectedTab}
                                pinnedPoint={pinnedPoint}
                                loadingCardId={loadingCardId}
                                handleCardClick={handleCardClick}
                            />
                        </div>
                    ) : null)}

                {selectedTab === "search" ? (
                    <SearchResultsList
                        results={searchResults}
                        isLoading={searchLoading}
                        query={searchQuery}
                        hasSearched={hasSearched}
                        loadingCardId={loadingCardId}
                        handleCardClick={handleCardClick}
                    />
                ) : selectedTab === "all" ? (
                    <AllTabContent
                        points={Array.isArray(points) ? points : []}
                        viewpoints={viewpoints}
                        isLoading={isLoading}
                        viewpointsLoading={viewpointsLoading}
                        combinedFeed={combinedFeed}
                        basePath={basePath}
                        space={space.data?.id ?? "global"}
                        setNegatedPointId={setNegatedPointId}
                        login={login}
                        user={privyUser}
                        pinnedPoint={pinnedPoint}
                        loginOrMakePoint={loginOrMakePoint}
                        handleNewViewpoint={handleNewViewpoint}
                        handleCardClick={handleCardClick}
                        loadingCardId={loadingCardId}
                    />
                ) : selectedTab === "points" ? (
                    <PointsTabContent
                        points={Array.isArray(points) ? points : []}
                        isLoading={isLoading}
                        combinedFeed={combinedFeed}
                        basePath={basePath}
                        space={space.data?.id ?? "global"}
                        setNegatedPointId={setNegatedPointId}
                        login={login}
                        user={privyUser}
                        pinnedPoint={pinnedPoint}
                        loginOrMakePoint={loginOrMakePoint}
                        handleCardClick={handleCardClick}
                        loadingCardId={loadingCardId}
                    />
                ) : (
                    <RationalesTabContent
                        viewpoints={viewpoints}
                        viewpointsLoading={viewpointsLoading}
                        basePath={basePath}
                        space={space.data?.id}
                        handleNewViewpoint={handleNewViewpoint}
                        handleCardClick={handleCardClick}
                        loadingCardId={loadingCardId}
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
                    className="aspect-square rounded-full h-[58px] w-[58px] sm:h-10 sm:w-auto sm:px-6 order-0"
                    onClick={() => setLeaderboardOpen(true)}
                >
                    <TrophyIcon className="size-7 sm:size-5" />
                    <span className="hidden sm:block ml-sm">Leaderboard</span>
                </Button>

                <Button
                    variant="ghost"
                    className="aspect-square rounded-full h-[58px] w-[58px] sm:h-10 sm:w-auto sm:px-6 order-1"
                    onClick={() => setShareDialogOpen(true)}
                >
                    <ShareIcon className="size-7 sm:size-5" />
                    <span className="hidden sm:block ml-sm">Share Points</span>
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
            <SharePointsDialog
                open={shareDialogOpen || isSharedView}
                onOpenChange={(open) => {
                    if (!isSharedView) {
                        setShareDialogOpen(open);
                    }
                }}
                isViewMode={isSharedView}
                sharedBy={sharedBy}
                initialPoints={sharedPoints}
            />
        </main>
    );
} 