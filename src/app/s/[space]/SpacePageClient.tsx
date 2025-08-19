"use client";

import { negatedPointIdAtom } from "@/atoms/negatedPointIdAtom";
import { useBasePath } from "@/hooks/utils/useBasePath";
import { preventDefaultIfContainsSelection } from "@/lib/utils/preventDefaultIfContainsSelection";
import { useFeed } from "@/queries/feed/useFeed";
import { usePrivy } from "@privy-io/react-auth";
import { useSetAtom, useAtom } from "jotai";
import { useCallback, useState, useMemo, memo, useEffect, useRef, Profiler } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useViewpoints } from "@/queries/viewpoints/useViewpoints";
import { useSearch } from "@/queries/search/useSearch";
import { usePinnedPoint } from "@/queries/points/usePinnedPoint";
import { usePriorityPoints } from "@/queries/points/usePriorityPoints";
import { useQueryClient } from "@tanstack/react-query";
import { usePrefetchPoint } from "@/queries/points/usePointData";
import React from "react";
import { initialSpaceTabAtom } from "@/atoms/navigationAtom";
import { useSpaceSearch } from "@/components/contexts/SpaceSearchContext";
import { PinnedPointWithHistory } from "@/components/space/PinnedPointWithHistory";
import { PriorityPointsSection } from "@/components/space/PriorityPointsSection";
import { UnifiedContentList } from "@/components/space/UnifiedContentList";
import { PriorityPointsSkeleton } from "@/components/space/skeletons";
import { SpaceLayout } from "@/components/layouts/SpaceLayout";
import { QuickActionsBar } from "@/components/space/QuickActionsBar";
import { SpaceTabs } from "@/components/space/SpaceTabs";
import { DeltaComparisonWidget } from "@/components/delta/DeltaComparisonWidget";
import { StatisticsSummaryCard } from "@/components/statistics/StatisticsSummaryCard";
import { LeaderboardCard } from "@/components/space/LeaderboardCard";

interface PageProps {
    params: { space: string };
    searchParams: { [key: string]: string | string[] | undefined };
}

export default function SpacePageClient({ params, searchParams }: PageProps) {
    const space = params.space;
    const { user: privyUser, login, ready } = usePrivy();
    const router = useRouter();
    const pathname = usePathname();
    const queryClient = useQueryClient();
    const basePath = useBasePath();
    const [loadingCardId, setLoadingCardId] = useState<string | null>(null);
    const { searchQuery, searchResults, isLoading: searchLoading, handleSearch, isActive, hasSearched } = useSearch();

    const setNegatedPointId = useSetAtom(negatedPointIdAtom);
    const [initialSpaceTab, setInitialSpaceTab] = useAtom(initialSpaceTabAtom);

    const [selectedTab, setSelectedTab] = useState<"all" | "points" | "rationales">("rationales");
    const [sortOrder, setSortOrder] = useState<"recent" | "favor" | "cred" | "activity">("recent");
    const [topicFilters, setTopicFilters] = useState<string[]>([]);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [topicsOpen, setTopicsOpen] = useState(false);
    const [selectedPointIds, setSelectedPointIds] = useState<number[]>([]);
    const [matchType, setMatchType] = useState<"any" | "all">("any");

    const { searchQuery: contextSearchQuery, activeTab, contentType, mobileFiltersOpen } = useSpaceSearch();

    const { data: feedData, isLoading: isFeedLoading } = useFeed({
        enabled: true,
    });
    const { data: viewpointsData, isLoading: isViewpointsLoading } = useViewpoints(space);
    const { data: pinnedPointData } = usePinnedPoint(space);
    const { data: priorityPointsData, isLoading: isPriorityPointsLoading } = usePriorityPoints();


    const handleNegate = useCallback((pointId: number) => {
        if (privyUser) {
            setNegatedPointId(pointId);
        } else {
            login();
        }
    }, [privyUser, setNegatedPointId, login]);

    // Navigation
    const handleNewViewpoint = useCallback(() => {
        router.push(`${basePath}/rationale/new`);
    }, [router, basePath]);

    // Content data processing
    const allFeedItems = useMemo(() => {
        if (!feedData || !Array.isArray(feedData)) return [];
        return feedData;
    }, [feedData]);

    const allViewpoints = useMemo(() => {
        return viewpointsData || [];
    }, [viewpointsData]);

    // Auto-scroll for initial space tab
    useEffect(() => {
        if (initialSpaceTab && typeof window !== 'undefined') {
            const timer = setTimeout(() => {
                const element = document.getElementById(`tab-${initialSpaceTab}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                setInitialSpaceTab(null);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [initialSpaceTab, setInitialSpaceTab]);

    // Event listeners cleanup
    // no-op cleanup

    // Invalidation handlers
    useEffect(() => {
        const handleEndorsementChange = (event: Event) => {
            const pointId = (event as CustomEvent)?.detail?.pointId;
            queryClient.invalidateQueries({ queryKey: ["feed", space] });
            queryClient.invalidateQueries({ queryKey: ["priority-points", space] });
            queryClient.invalidateQueries({ queryKey: ["user-viewpoints"] });
            if (pointId) {
                queryClient.invalidateQueries({ queryKey: ["point", pointId] });
            }
        };

        window.addEventListener("endorse-event", handleEndorsementChange);
        return () => window.removeEventListener("endorse-event", handleEndorsementChange);
    }, [queryClient, space]);

    const isLoading = isFeedLoading || isViewpointsLoading;

    const headerContent = (
        <>
            <QuickActionsBar />
            <SpaceTabs
                selectedTab={selectedTab}
                onTabChange={setSelectedTab}
                spaceId={space}
                onNewViewpoint={handleNewViewpoint}
                filtersOpen={filtersOpen}
                onFiltersToggle={() => setFiltersOpen(!filtersOpen)}
                topicsOpen={topicsOpen}
                onTopicsToggle={() => setTopicsOpen(!topicsOpen)}
                sortOrder={sortOrder}
                onSortOrderChange={setSortOrder}
                topicFilters={topicFilters}
                onTopicFiltersChange={setTopicFilters}
                points={allFeedItems}
                selectedPointIds={selectedPointIds}
                onPointSelect={(pointId) => setSelectedPointIds([...selectedPointIds, pointId])}
                onPointDeselect={(pointId) => setSelectedPointIds(selectedPointIds.filter(id => id !== pointId))}
                onClearAll={() => setSelectedPointIds([])}
                matchType={matchType}
                onMatchTypeChange={setMatchType}
            />
        </>
    );

    const mainContent = hasSearched && isActive ? (
        <div className="mx-auto w-full max-w-5xl px-3">
            <UnifiedContentList
                space={space}
                contentType={selectedTab}
                searchQuery={contextSearchQuery}
                points={allFeedItems}
                viewpoints={allViewpoints}
                basePath={basePath}
                isLoading={isLoading}
                sortOrder={sortOrder}
                selectedPointIds={selectedPointIds}
                matchType={matchType}
                topicFilters={topicFilters}
                user={privyUser}
                login={() => { }}
                setNegatedPointId={handleNegate}
                handleNewViewpoint={handleNewViewpoint}
                handleCardClick={(id: string) => setLoadingCardId(id)}
                loadingCardId={loadingCardId}
            />
        </div>
    ) : (
        <Profiler
            id="SpaceContent"
            onRender={(id, phase, actualDuration) => {
                if (process.env.NODE_ENV === 'development') {
                    console.log(`${id} ${phase} took ${actualDuration}ms`);
                }
            }}
        >
            <div className="mx-auto w-full max-w-5xl px-3">
                <div className="bg-background border rounded-lg shadow-sm p-6">
                    <div className="space-y-6">
                        {/* Priority Points Section - Hide in rationales tab and during search */}
                        {selectedTab !== "rationales" && !contextSearchQuery?.trim() && (
                            isPriorityPointsLoading ? (
                                <PriorityPointsSkeleton />
                            ) : priorityPointsData && priorityPointsData.length > 0 ? (
                                <PriorityPointsSection
                                    filteredPriorityPoints={priorityPointsData}
                                    basePath={basePath}
                                    space={space}
                                    setNegatedPointId={handleNegate}
                                    login={() => { }}
                                    user={privyUser}
                                    selectedTab={selectedTab}
                                    loadingCardId={loadingCardId}
                                    handleCardClick={(id: string) => setLoadingCardId(id)}
                                />
                            ) : null
                        )}

                        {/* Pinned Point */}
                        {pinnedPointData && (
                            <PinnedPointWithHistory
                                pinnedPoint={pinnedPointData}
                                space={space}
                                basePath={basePath}
                                loadingCardId={null}
                                handleCardClick={() => { }}
                                handleNavigate={(e, encodedId) => {
                                    preventDefaultIfContainsSelection(e);
                                    router.push(`${basePath}/${encodedId}`);
                                }}
                            />
                        )}

                        <UnifiedContentList
                            space={space}
                            contentType={selectedTab}
                            searchQuery={contextSearchQuery}
                            points={allFeedItems}
                            viewpoints={allViewpoints}
                            basePath={basePath}
                            isLoading={isLoading}
                            sortOrder={sortOrder}
                            selectedPointIds={selectedPointIds}
                            matchType={matchType}
                            topicFilters={topicFilters}
                            user={privyUser}
                            login={() => { }}
                            setNegatedPointId={handleNegate}
                            handleNewViewpoint={handleNewViewpoint}
                            handleCardClick={(id: string) => setLoadingCardId(id)}
                            loadingCardId={loadingCardId}
                        />
                    </div>
                </div>
            </div>
        </Profiler>
    );

    const topRightSidebarContent = (
        <div className="mb-4">
            <DeltaComparisonWidget
                comparison={{ type: "space", spaceId: space }}
                title="Space Alignment"
                description="Find aligned users in this space"
                currentUserId={privyUser?.id}
                spaceId={space}
            />
        </div>
    );

    const rightSidebarContent = (
        <div className="space-y-4 h-full">
            <StatisticsSummaryCard space={space} />
            <LeaderboardCard space={space} />
        </div>
    );

    return (
        <SpaceLayout
            space={space}
            header={headerContent}
            rightSidebarContent={rightSidebarContent}
            topRightSidebarContent={topRightSidebarContent}
            onCreateRationale={handleNewViewpoint}
            showUserProfilePreview={true}
            topicFilters={topicFilters}
            onTopicFiltersChange={setTopicFilters}
        >
            {mainContent}

            {/* Dialogs */}
        </SpaceLayout>
    );
}