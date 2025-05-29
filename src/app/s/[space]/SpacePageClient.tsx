"use client";

import { negatedPointIdAtom } from "@/atoms/negatedPointIdAtom";
import { Loader } from "@/components/ui/loader";
import { useBasePath } from "@/hooks/utils/useBasePath";
import { preventDefaultIfContainsSelection } from "@/lib/utils/preventDefaultIfContainsSelection";
import { useFeed } from "@/queries/feed/useFeed";
import { useSpace } from "@/queries/space/useSpace";
import { usePrivy } from "@privy-io/react-auth";
import { useSetAtom, useAtom } from "jotai";
import { PlusIcon, EyeIcon } from "lucide-react";
import { useCallback, useState, useMemo, memo, useEffect, useRef, Profiler } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useViewpoints } from "@/queries/viewpoints/useViewpoints";
import { useSearch } from "@/queries/search/useSearch";
import { SearchResultsList } from "@/components/search/SearchResultsList";
import { usePinnedPoint } from "@/queries/points/usePinnedPoint";
import { usePriorityPoints } from "@/queries/points/usePriorityPoints";
import { useQueryClient } from "@tanstack/react-query";
import { usePrefetchPoint } from "@/queries/points/usePointData";
import React from "react";
import { initialSpaceTabAtom } from "@/atoms/navigationAtom";
import { makePointSuggestionAtom } from "@/atoms/makePointSuggestionAtom";
import { SpaceHeader } from "@/components/space/SpaceHeader";
import { SpaceTabs } from "@/components/space/SpaceTabs";
import { PinnedPointWithHistory } from "@/components/space/PinnedPointWithHistory";
import { FeedItem } from "@/components/space/FeedItem";
import { AllTabContent } from "@/components/space/AllTabContent";
import { RationalesTabContent } from "@/components/space/RationalesTabContent";
import { PriorityPointsSection } from "@/components/space/PriorityPointsSection";
import { PointsTabContent } from "@/components/space/PointsTabContent";
import { useResetLoadingOnPathChange } from "@/hooks/ui/useResetLoadingOnPathChange";

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

type Tab = "all" | "points" | "rationales" | "search";


export function SpacePageClient({ params, searchParams: _searchParams }: PageProps) {
    const { user: privyUser, login } = usePrivy();
    const setMakePointSuggestion = useSetAtom(makePointSuggestionAtom);
    const basePath = useBasePath();
    const space = useSpace(params.space);
    const router = useRouter();
    const pathname = usePathname();
    const [isNavigating, setIsNavigating] = useState(false);
    const [initialTabFromAtom, setInitialTabAtom] = useAtom(initialSpaceTabAtom);
    const queryClient = useQueryClient();

    const lastTabViewTimes = useRef<Record<string, number>>({
        rationales: 0,
        points: 0,
        all: 0,
        search: 0
    });

    const { data: viewpoints, isLoading: viewpointsLoading } = useViewpoints(space.data?.id || "global");

    const [selectedTab, setSelectedTab] = useState<Tab | null>(null);
    const [isAiAssistantLoading, setIsAiAssistantLoading] = useState(false);


    useEffect(() => {
        if (selectedTab === null && initialTabFromAtom) {
            setSelectedTab(initialTabFromAtom);
            setInitialTabAtom(null);
        } else if (selectedTab === null && !initialTabFromAtom) {
            setSelectedTab("rationales");
        }
    }, [initialTabFromAtom, selectedTab, setInitialTabAtom]);

    const { searchQuery, searchResults, isLoading: searchLoading, handleSearch, isActive, hasSearched } = useSearch();
    const [loadingCardId, setLoadingCardId] = useState<string | null>(null);

    const handleCardClick = useCallback((id: string) => {
        setLoadingCardId(id);
    }, []);

    useResetLoadingOnPathChange(pathname, () => {
        setLoadingCardId(null);
        setIsAiAssistantLoading(false);
    });

    useEffect(() => {
        if (privyUser?.id && isNavigating) {
            queryClient.setQueryData(["feed", privyUser?.id], (oldData: any) => oldData);
        }
    }, [queryClient, privyUser?.id, isNavigating]);

    const { data: points, isLoading } = useFeed();

    const {
        data: priorityPoints,
        isLoading: priorityPointsLoading
    } = usePriorityPoints();

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
            setMakePointSuggestion({ text: "", context: "space" });
        } else {
            login();
        }
    }, [privyUser, login, setMakePointSuggestion]);

    const filteredPriorityPoints = useMemo(() => {
        if (!priorityPoints || priorityPointsLoading) return [];

        const uniquePriorityPoints = Array.from(
            new Map(priorityPoints.map(point => [point.pointId, point])).values()
        );

        return uniquePriorityPoints.filter(point => {
            return !pinnedPoint || point.pointId !== pinnedPoint.pointId;
        });
    }, [priorityPoints, pinnedPoint, priorityPointsLoading]);

    const pinnedAndPriorityPoints = useMemo(() => {
        const pointIds = new Set<number>();

        if (filteredPriorityPoints?.length) {
            filteredPriorityPoints.forEach(point => pointIds.add(point.pointId));
        }

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

        const includePoints = selectedTab !== "rationales";
        const includeRationales = selectedTab === "all" || selectedTab === "rationales";

        if (includePoints && Array.isArray(points)) {
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

    const handleSearchChange = (value: string) => {
        handleSearch(value);
        if (value.trim().length > 0 && selectedTab !== "search") {
            setSelectedTab("search");
        }
    };

    const handlePinnedPointClick = (e: React.MouseEvent, encodedId: string) => {
        preventDefaultIfContainsSelection(e);
        router.push(`${basePath}/${encodedId}`);
    }

    const prefetchPoint = usePrefetchPoint();

    const handleAiAssistantClick = () => {
        setIsAiAssistantLoading(true);
        router.push(`${basePath}/chat`);
    };

    if (selectedTab === null) {
        return (
            <main className="flex-1 grid sm:grid-cols-[minmax(200px,600px)_1fr] overflow-auto bg-background min-h-0">
                <div className="col-span-full flex items-center justify-center h-full">
                    <Loader className="size-8" />
                </div>
            </main>
        );
    }

    return (
        <main className="flex-1 grid sm:grid-cols-[minmax(200px,600px)_1fr] bg-background min-h-0">
            <div className="relative w-full flex flex-col min-h-0">
                {/* Sticky header with toolbar, space header, and tabs */}
                <div className="sticky top-0 z-20 bg-background">
                    <div className="flex flex-col items-center sm:hidden gap-4 p-4 bg-background">
                        <div className="flex gap-4 justify-center">
                            <button
                                type="button"
                                onClick={loginOrMakePoint}
                                className="w-60 h-60 bg-background border hover:bg-accent transition-colors rounded-lg flex flex-col items-center justify-center p-6"
                            >
                                <PlusIcon className="size-16 mb-4" />
                                <span className="text-2xl font-bold">Make a Point</span>
                                <span className="text-base text-muted-foreground text-center mt-2">Add a new discussion point</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleNewViewpoint}
                                className="w-60 h-60 bg-background border hover:bg-accent transition-colors rounded-lg flex flex-col items-center justify-center p-6"
                            >
                                <EyeIcon className="size-16 mb-4" />
                                <span className="text-2xl font-bold">New Rationale</span>
                                <span className="text-base text-muted-foreground text-center mt-2">Begin a new rationale</span>
                            </button>
                        </div>
                        <button
                            type="button"
                            disabled
                            className="w-60 h-60 bg-background border rounded-lg flex flex-col items-center justify-center p-6 opacity-50 cursor-not-allowed mx-auto mt-4"
                        >
                            <PlusIcon className="size-16 mb-4" />
                            <span className="text-2xl font-bold">Make a Negation</span>
                            <span className="text-base text-muted-foreground text-center mt-2">Propose a new negation</span>
                        </button>
                    </div>
                    <SpaceHeader
                        space={space}
                        isLoading={isAiAssistantLoading}
                        onAiClick={handleAiAssistantClick}
                    />
                    <SpaceTabs
                        selectedTab={selectedTab}
                        onTabChange={handleTabChange}
                        searchQuery={searchQuery}
                        onSearchChange={handleSearchChange}
                        isAiLoading={isAiAssistantLoading}
                        onAiClick={handleAiAssistantClick}
                        spaceId={space.data?.id ?? "global"}
                    />
                </div>
                {/* Scrollable feed content below sticky header */}
                <div className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 min-h-0">
                    {selectedTab === null && (
                        <div className="col-span-full flex items-center justify-center h-full">
                            <Loader className="size-8" />
                        </div>
                    )}

                    {selectedTab !== "search" && selectedTab !== "rationales" &&
                        pinnedPoint && !pinnedPointLoading && isInSpecificSpace && (
                            <div className="border-b transition-opacity duration-200 ease-in-out">
                                <PinnedPointWithHistory
                                    pinnedPoint={pinnedPoint}
                                    space={space.data?.id ?? "global"}
                                    loadingCardId={loadingCardId}
                                    basePath={basePath}
                                    handleCardClick={handleCardClick}
                                    handleNavigate={handlePinnedPointClick}
                                />
                            </div>
                        )}

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
                                    space={space.data?.id ?? "global"}
                                    setNegatedPointId={setNegatedPointId}
                                    login={login}
                                    user={privyUser}
                                    selectedTab={selectedTab}
                                    loadingCardId={loadingCardId}
                                    handleCardClick={handleCardClick}
                                    onPrefetchPoint={prefetchPoint}
                                />
                            </div>
                        ) : null)}

                    {selectedTab === "search" ? (
                        searchQuery.trim().length >= 2 ? (
                            <SearchResultsList
                                results={searchResults}
                                isLoading={searchLoading}
                                query={searchQuery}
                                hasSearched={hasSearched}
                                loadingCardId={loadingCardId}
                                handleCardClick={handleCardClick}
                            />
                        ) : (
                            <Profiler
                                id="SearchPointsTabContent"
                                onRender={(id, phase, actualDuration) => {
                                    console.log(
                                        `SearchPointsTabContent [${phase}] render time: ${actualDuration}ms`
                                    );
                                }}
                            >
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
                                    onPrefetchPoint={prefetchPoint}
                                />
                            </Profiler>
                        )
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
                            onPrefetchPoint={prefetchPoint}
                        />
                    ) : selectedTab === "points" ? (
                        <Profiler id="PointsTabContent" onRender={(id, phase, actualDuration) => {
                            console.log(`PointsTabContent [${phase}] render time: ${actualDuration}ms`);
                        }}>
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
                                onPrefetchPoint={prefetchPoint}
                            />
                        </Profiler>
                    ) : (
                        <RationalesTabContent
                            viewpoints={viewpoints}
                            viewpointsLoading={viewpointsLoading}
                            space={space.data?.id ?? "global"}
                            handleNewViewpoint={handleNewViewpoint}
                            handleCardClick={handleCardClick}
                            loadingCardId={loadingCardId}
                            points={Array.isArray(points) ? points : []}
                        />
                    )}
                </div>
            </div>
            <aside className="hidden sm:flex flex-col items-center justify-center p-6 gap-8 border-l">
                <div className="flex gap-8">
                    <button
                        type="button"
                        onClick={loginOrMakePoint}
                        className="w-72 h-72 bg-background border hover:bg-accent transition-colors rounded-lg flex flex-col items-center justify-center p-6"
                    >
                        <PlusIcon className="size-16 mb-4" />
                        <span className="text-2xl font-bold">Make a Point</span>
                        <span className="text-base text-muted-foreground text-center mt-2">Add a new discussion point</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleNewViewpoint}
                        className="w-72 h-72 bg-background border hover:bg-accent transition-colors rounded-lg flex flex-col items-center justify-center p-6"
                    >
                        <EyeIcon className="size-16 mb-4" />
                        <span className="text-2xl font-bold">New Rationale</span>
                        <span className="text-base text-muted-foreground text-center mt-2">Begin a new rationale</span>
                    </button>
                </div>
                <button
                    type="button"
                    disabled
                    className="w-72 h-72 bg-background border rounded-lg flex flex-col items-center justify-center p-6 opacity-50 cursor-not-allowed"
                >
                    <PlusIcon className="size-16 mb-4" />
                    <span className="text-2xl font-bold">Make a Negation</span>
                    <span className="text-base text-muted-foreground text-center mt-2">Propose a new negation</span>
                </button>
            </aside>
        </main>
    );
} 