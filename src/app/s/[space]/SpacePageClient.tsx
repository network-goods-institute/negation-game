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
    type: 'viewpoint';
    id: string;
    content: string;
    createdAt: Date;
    data: any;
};

type FeedItem = PointItem | ViewpointItem;

const MemoizedPointCard = memo(PointCard);
const MemoizedViewpointCard = memo(ViewpointCard);

const FeedItem = memo(({ item, basePath, space, setNegatedPointId, login, user, pinnedPoint }: any) => {
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
                        user !== null ? setNegatedPointId(point.pointId) : login();
                    }}
                    pinnedCommandPointId={pinnedCommandPointId}
                    pinStatus={pinStatus}
                    onPinBadgeClickCapture={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                    linkDisabled={true}
                />
            </Link>
        );
    } else if (item.type === 'viewpoint') {
        const viewpoint = item.data;
        return (
            <Link
                draggable={false}
                href={`${basePath}/viewpoint/${item.id}`}
                className="flex border-b cursor-pointer hover:bg-accent"
            >
                <MemoizedViewpointCard
                    className="flex-grow p-6 w-full"
                    id={viewpoint.id}
                    title={viewpoint.title || ''}
                    description={viewpoint.description || ''}
                    author={viewpoint.author || ''}
                    createdAt={new Date(viewpoint.createdAt)}
                    space={space || "global"}
                    linkable={false}
                />
            </Link>
        );
    }

    return null;
});
FeedItem.displayName = 'FeedItem';

const PriorityPointItem = memo(({ point, basePath, space, setNegatedPointId, login, user, pinnedPoint }: any) => {
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
                    user !== null ? setNegatedPointId(point.pointId) : login();
                }}
                pinnedCommandPointId={pinnedCommandPointId}
                pinStatus={pinStatus}
                onPinBadgeClickCapture={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }}
                linkDisabled={true}
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
    const [selectedTab, setSelectedTab] = useState<"all" | "points" | "viewpoints" | "search">("all");
    const { searchQuery, searchResults, isLoading: searchLoading, handleSearch, isActive, hasSearched } = useSearch();

    // Prevent feed from reloading when navigating back to it
    useEffect(() => {
        // Only prevent refetching if we're not actively using the feed
        // This allows mutations like endorsements to trigger refetches
        if (user?.id && isNavigating) {
            queryClient.setQueryData(["feed", user?.id], (oldData: any) => oldData);
        }
    }, [queryClient, user?.id, isNavigating]);

    const shouldLoadPriorityPoints = selectedTab !== "search" && selectedTab !== "viewpoints";

    const {
        data: priorityPoints,
        isLoading: priorityPointsLoading
    } = usePriorityPoints(shouldLoadPriorityPoints);

    const { data: pinnedPoint, isLoading: pinnedPointLoading } = usePinnedPoint(
        shouldLoadPriorityPoints ? space.data?.id : undefined
    );

    const handleNewViewpoint = () => {
        if (user) {
            setIsNavigating(true);
            router.push(`${basePath}/viewpoint/new`);
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
        if (!priorityPoints || priorityPointsLoading || !shouldLoadPriorityPoints) return [];

        // First remove any duplicate points within priority points itself
        const uniquePriorityPoints = Array.from(
            new Map(priorityPoints.map(point => [point.pointId, point])).values()
        );

        // Then filter out the pinned point if it exists
        return uniquePriorityPoints.filter(point => {
            return !pinnedPoint || point.pointId !== pinnedPoint.pointId;
        });
    }, [priorityPoints, pinnedPoint, priorityPointsLoading, shouldLoadPriorityPoints]);

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

    const combinedFeed = useMemo(() => {
        if (!points) {
            return [];
        }
        const allItems: FeedItem[] = [];

        // Add all points to the feed, except those in pinnedAndPriorityPoints
        points.filter(point => !pinnedAndPriorityPoints.has(point.pointId)).forEach(point => {
            allItems.push({
                type: 'point',
                id: `point-${point.pointId}`,
                content: point.content,
                createdAt: point.createdAt,
                data: point,
            });
        });

        if (viewpoints && (selectedTab === 'all' || selectedTab === 'viewpoints')) {
            viewpoints.forEach(viewpoint => {
                allItems.push({
                    type: 'viewpoint',
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
                            onClick={() => setSelectedTab("all")}
                            className={cn(
                                "py-2 px-4 rounded focus:outline-none",
                                selectedTab === "all" ? "bg-primary text-white" : "bg-transparent text-primary"
                            )}
                        >
                            All
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
                            onClick={() => setSelectedTab("viewpoints")}
                            className={cn(
                                "py-2 px-4 rounded focus:outline-none",
                                selectedTab === "viewpoints" ? "bg-primary text-white" : "bg-transparent text-primary"
                            )}
                        >
                            Viewpoints
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
                                placeholder="Search points, viewpoints, or authors..."
                            />
                        </div>
                    )}
                </div>

                {/* Pinned Point - with transition */}
                {selectedTab !== "search" && selectedTab !== "viewpoints" &&
                    pinnedPoint && !pinnedPointLoading && isInSpecificSpace && (
                        <div className="border-b transition-opacity duration-200 ease-in-out">
                            <Link
                                draggable={false}
                                onClick={preventDefaultIfContainsSelection}
                                href={`${basePath}/${encodeId(pinnedPoint.pointId)}`}
                                className="flex cursor-pointer hover:bg-accent"
                            >
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
                                    space={space.data?.id}
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
                                />
                            </Link>
                        </div>
                    )}

                {/* Priority Points - with transition */}
                {selectedTab !== "search" && selectedTab !== "viewpoints" &&
                    !priorityPointsLoading &&
                    !pinnedPointLoading &&
                    filteredPriorityPoints.length > 0 && (
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
                    )}

                {selectedTab === "search" ? (
                    <SearchResultsList
                        results={searchResults}
                        isLoading={searchLoading}
                        query={searchQuery}
                        hasSearched={hasSearched}
                    />
                ) : selectedTab === "all" ? (
                    (!points || !viewpoints || isLoading || viewpointsLoading) ? (
                        <Loader className="absolute self-center my-auto top-0 bottom-0" />
                    ) : points.length === 0 && viewpoints.length === 0 ? (
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
                                    Create a Viewpoint
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {combinedFeed.map(item => (
                                <FeedItem
                                    key={item.id}
                                    item={item}
                                    basePath={basePath}
                                    space={space.data?.id}
                                    setNegatedPointId={setNegatedPointId}
                                    login={login}
                                    user={user}
                                    pinnedPoint={pinnedPoint}
                                />
                            ))}
                        </>
                    )
                ) : selectedTab === "points" ? (
                    !points || isLoading ? (
                        <Loader className="absolute self-center my-auto top-0 bottom-0" />
                    ) : points.length === 0 ? (
                        <div className="flex flex-col flex-grow items-center justify-center gap-4 py-12 text-center min-h-[50vh]">
                            <span className="text-muted-foreground">Nothing here yet</span>
                            <Button variant="outline" onClick={loginOrMakePoint}>
                                <PlusIcon className="mr-2 size-4" />
                                Make a Point
                            </Button>
                        </div>
                    ) : (
                        combinedFeed
                            .filter(item => item.type === 'point')
                            .map(item => (
                                <FeedItem
                                    key={item.id}
                                    item={item}
                                    basePath={basePath}
                                    space={space.data?.id}
                                    setNegatedPointId={setNegatedPointId}
                                    login={login}
                                    user={user}
                                    pinnedPoint={pinnedPoint}
                                />
                            ))
                    )
                ) : (
                    viewpoints === undefined || viewpointsLoading ? (
                        <Loader className="absolute self-center my-auto top-0 bottom-0" />
                    ) : viewpoints.length === 0 ? (
                        <div className="flex flex-col flex-grow items-center justify-center gap-4 py-12 text-center min-h-[50vh]">
                            <span className="text-muted-foreground">Nothing here yet</span>
                            <Button variant="outline" onClick={handleNewViewpoint}>
                                <ViewpointIcon className="mr-2.5 size-4" />
                                Create a Viewpoint
                            </Button>
                        </div>
                    ) : (
                        viewpoints.map((viewpoint) => (
                            <ViewpointCard
                                key={`viewpoints-tab-${viewpoint.id}`}
                                id={viewpoint.id}
                                title={viewpoint.title}
                                description={viewpoint.description}
                                author={viewpoint.author}
                                createdAt={new Date(viewpoint.createdAt)}
                                space={space.data?.id || "global"}
                                linkable={true}
                            />
                        ))
                    )
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
                            <span className="hidden sm:block ml-sm">New Viewpoint</span>
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