"use client";

import { negatedPointIdAtom } from "@/atoms/negatedPointIdAtom";
import { Loader } from "@/components/ui/loader";
import { useBasePath } from "@/hooks/utils/useBasePath";
import { preventDefaultIfContainsSelection } from "@/lib/utils/preventDefaultIfContainsSelection";
import { useFeed } from "@/queries/feed/useFeed";
import { useSpace } from "@/queries/space/useSpace";
import { usePrivy } from "@privy-io/react-auth";
import { useSetAtom, useAtom } from "jotai";
import { useCallback, useState, useMemo, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useViewpoints } from "@/queries/viewpoints/useViewpoints";
import { usePinnedPoint } from "@/queries/points/usePinnedPoint";
import { usePriorityPoints } from "@/queries/points/usePriorityPoints";
import { useQueryClient } from "@tanstack/react-query";
import { usePrefetchPoint } from "@/queries/points/usePointData";
import React, { Suspense } from "react";
import { initialSpaceTabAtom } from "@/atoms/navigationAtom";
import { useSpaceSearch } from "@/components/contexts/SpaceSearchContext";
import { PinnedPointWithHistory } from "@/components/space/PinnedPointWithHistory";
import { PriorityPointsSection } from "@/components/space/PriorityPointsSection";
import { UnifiedContentList } from "@/components/space/UnifiedContentList";
import { SelectPointForNegationDialog } from "@/components/dialogs/SelectPointForNegationDialog";
import { selectPointForNegationOpenAtom } from "@/atoms/selectPointForNegationOpenAtom";
import { setPrivyToken } from "@/lib/privy/setPrivyToken";
import { PriorityPointsSkeleton } from "@/components/space/skeletons";

import { SpaceLayout } from "@/components/layouts/SpaceLayout";
import { QuickActionsBar } from "@/components/space/QuickActionsBar";
import { SpaceTabs } from "@/components/space/SpaceTabs";

interface PageProps {
    params: { space: string };
    searchParams: { [key: string]: string | string[] | undefined };
}

type Tab = "all" | "points" | "rationales";
export type SortOrder = "recent" | "favor" | "cred" | "activity";

export function SpacePageClient({ params, searchParams: _searchParams }: PageProps) {
    const { user: privyUser, login } = usePrivy();
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
        all: 0
    });

    const [selectedTab, setSelectedTab] = useState<Tab | null>(null);
    const [isNewRationaleLoading, setIsNewRationaleLoading] = useState(false);
    const [isSelectNegationOpen, setIsSelectNegationOpen] = useAtom(selectPointForNegationOpenAtom);
    const [sortOrder, setSortOrder] = useState<SortOrder>("recent");

    const { data: viewpoints, isLoading: viewpointsLoading } = useViewpoints(params.space);

    // Filter states
    const [selectedPointIds, setSelectedPointIds] = useState<number[]>([]);
    const [matchType, setMatchType] = useState<"any" | "all">("any");
    const [topicFilters, setTopicFilters] = useState<string[]>([]);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [topicsOpen, setTopicsOpen] = useState(false);
    const [isRefetchingFeed, setIsRefetchingFeed] = useState(false);
    const [selectedItem, setSelectedItem] = useState<{ type: 'point' | 'rationale'; data: any } | null>(null);

    useEffect(() => {
        if (selectedTab === null) {
            if (initialTabFromAtom) {
                setSelectedTab(initialTabFromAtom);
                // Use queueMicrotask to ensure this happens after the current update cycle
                queueMicrotask(() => setInitialTabAtom(null));
            } else {
                setSelectedTab("rationales");
            }
        }
    }, []); // Only run once on mount

    // Handle close topics event from mobile overlay
    useEffect(() => {
        const handleCloseTopics = () => {
            setTopicsOpen(false);
        };

        window.addEventListener('closeTopics', handleCloseTopics);
        return () => {
            window.removeEventListener('closeTopics', handleCloseTopics);
        };
    }, []);

    const { searchQuery } = useSpaceSearch();
    const [loadingCardId, setLoadingCardId] = useState<string | null>(null);

    const handleCardClick = useCallback((id: string, item?: any) => {
        setLoadingCardId(id);

        // Set the selected item if provided
        if (item) {
            if (id.startsWith('point-')) {
                setSelectedItem({ type: 'point', data: item });
            } else if (id.startsWith('rationale-')) {
                setSelectedItem({ type: 'rationale', data: item });
            }
        }
    }, []);

    // Keep the loading indicator visible until this component unmounts (i.e. when we fully leave
    // the space feed). Clearing it immediately on pathname change was causing the spinner to
    // disappear too early.
    useEffect(() => {
        return () => {
            setLoadingCardId(null);
            setIsNewRationaleLoading(false);
        };
    }, []);

    useEffect(() => {
        if (privyUser?.id && isNavigating) {
            queryClient.setQueryData(["feed", privyUser?.id], (oldData: any) => oldData);
        }
    }, [queryClient, privyUser?.id, isNavigating]);

    const { data: points, isLoading, refetch: refetchFeed } = useFeed();

    const {
        data: priorityPoints,
        isLoading: priorityPointsLoading
    } = usePriorityPoints();

    const shouldLoadPinnedPoint = params.space !== "global";

    const { data: pinnedPoint, isLoading: pinnedPointLoading } = usePinnedPoint(
        shouldLoadPinnedPoint ? params.space : undefined
    );

    const handleTabChange = useCallback((tab: Tab) => {
        setSelectedTab(tab);

        if (lastTabViewTimes.current) {
            lastTabViewTimes.current[tab] = Date.now();
        }

    }, []);

    const handleNewViewpoint = () => {
        if (privyUser) {
            setIsNavigating(true);
            setIsNewRationaleLoading(true);
            router.push(`${basePath}/rationale/new`);
        } else {
            login();
        }
    };

    const setNegatedPointId = useSetAtom(negatedPointIdAtom);

    const isInSpecificSpace = pathname?.includes('/s/') && !pathname.match(/^\/s\/global\//);


    const filteredPriorityPoints = useMemo(() => {
        if (!priorityPoints || priorityPointsLoading) return [];

        const uniquePriorityPoints = Array.from(
            new Map(priorityPoints.map(point => [point.pointId, point])).values()
        );

        return uniquePriorityPoints.filter(point => {
            return !pinnedPoint || point.pointId !== pinnedPoint.pointId;
        }).slice(0, 3);
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



    const handlePinnedPointClick = (e: React.MouseEvent, encodedId: string) => {
        preventDefaultIfContainsSelection(e);
        router.push(`${basePath}/${encodedId}`);
    }

    const prefetchPoint = usePrefetchPoint();



    const handlePointSelect = useCallback((pointId: number) => {
        setSelectedPointIds(prev => [...prev, pointId]);
    }, []);

    const handlePointDeselect = useCallback((pointId: number) => {
        setSelectedPointIds(prev => prev.filter(id => id !== pointId));
    }, []);

    const handleClearAll = useCallback(() => {
        setSelectedPointIds([]);
    }, []);

    const handleMatchTypeChange = useCallback((type: "any" | "all") => {
        setMatchType(type);
    }, []);

    const handleRefetchFeed = useCallback(async () => {
        setIsRefetchingFeed(true);
        try {
            await setPrivyToken();
            await refetchFeed();
        } catch (error) {
            console.error("Error refetching feed:", error);
        } finally {
            setIsRefetchingFeed(false);
        }
    }, [refetchFeed]);

    if (selectedTab === null) {
        return (
            <SpaceLayout
                space={params.space}
                header={null}
                onCreateRationale={handleNewViewpoint}
                isCreatingRationale={isNewRationaleLoading}
                topicFilters={topicFilters}
                onTopicFiltersChange={setTopicFilters}
                topicsOpen={topicsOpen}
                onTopicsToggle={setTopicsOpen}
            >
                <div className="flex items-center justify-center flex-grow h-[calc(100vh-var(--header-height)-8rem)]">
                    <Loader className="size-6" />
                </div>
            </SpaceLayout>
        );
    }

    const header = (
        <SpaceTabs
            selectedTab={selectedTab ?? "rationales"}
            onTabChange={handleTabChange}
            spaceId={space.data?.id ?? "global"}
            onNewViewpoint={handleNewViewpoint}
            isNewRationaleLoading={isNewRationaleLoading}
            filtersOpen={filtersOpen}
            onFiltersToggle={() => setFiltersOpen(!filtersOpen)}
            topicsOpen={topicsOpen}
            onTopicsToggle={() => setTopicsOpen(!topicsOpen)}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            topicFilters={topicFilters}
            onTopicFiltersChange={setTopicFilters}
            points={Array.isArray(points) ? points : []}
            selectedPointIds={selectedPointIds}
            onPointSelect={handlePointSelect}
            onPointDeselect={handlePointDeselect}
            onClearAll={handleClearAll}
            matchType={matchType}
            onMatchTypeChange={handleMatchTypeChange}
        />
    )

    return (
        <SpaceLayout
            space={params.space}
            header={header}
            onCreateRationale={handleNewViewpoint}
            isCreatingRationale={isNewRationaleLoading}
            topicFilters={topicFilters}
            onTopicFiltersChange={setTopicFilters}
            topicsOpen={topicsOpen}
            onTopicsToggle={setTopicsOpen}
        >
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-0 pb-6 h-full">
                <QuickActionsBar className="-mx-4 sm:-mx-6 lg:-mx-8 mb-6" />

                {selectedTab !== "rationales" &&
                    pinnedPoint && !pinnedPointLoading && isInSpecificSpace && (
                        <div className="border-b transition-opacity duration-200 ease-in-out">
                            <PinnedPointWithHistory
                                pinnedPoint={pinnedPoint}
                                space={params.space}
                                loadingCardId={loadingCardId}
                                basePath={basePath}
                                handleCardClick={handleCardClick}
                                handleNavigate={handlePinnedPointClick}
                            />
                        </div>
                    )}

                {selectedTab !== "rationales" &&
                    (priorityPointsLoading && space.data ? (
                        <PriorityPointsSkeleton count={2} />
                    ) : filteredPriorityPoints.length > 0 ? (
                        <div className="border-b transition-opacity duration-200 ease-in-out">
                            <PriorityPointsSection
                                filteredPriorityPoints={filteredPriorityPoints}
                                basePath={basePath}
                                space={params.space}
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

                <UnifiedContentList
                    points={Array.isArray(points) ? points : []}
                    viewpoints={viewpoints}
                    isLoading={isLoading}
                    viewpointsLoading={viewpointsLoading}
                    contentType={selectedTab}
                    searchQuery={searchQuery}
                    basePath={basePath}
                    space={params.space}
                    sortOrder={sortOrder}
                    selectedPointIds={selectedPointIds}
                    matchType={matchType}
                    topicFilters={topicFilters}
                    user={privyUser}
                    login={login}
                    setNegatedPointId={setNegatedPointId}
                    handleNewViewpoint={handleNewViewpoint}
                    handleCardClick={handleCardClick}
                    onPrefetchPoint={prefetchPoint}
                    onRefetchFeed={handleRefetchFeed}
                    pinnedPoint={pinnedPoint}
                    loadingCardId={loadingCardId}
                    isRefetching={isRefetchingFeed}
                />
            </div>

            <Suspense fallback={null}>
                <SelectPointForNegationDialog
                    isOpen={isSelectNegationOpen}
                    onOpenChange={setIsSelectNegationOpen}
                    onPointSelected={(id) => {
                        // TODO: Handle negation selection
                        // since like do we need it anymore
                    }}
                />
            </Suspense>
        </SpaceLayout>
    );
} 