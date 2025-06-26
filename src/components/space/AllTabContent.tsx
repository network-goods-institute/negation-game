"use client";

import React, { memo, useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, RefreshCwIcon } from "lucide-react";
import { ViewpointIcon } from "@/components/icons/AppIcons";
import { FeedItem } from "@/components/space/FeedItem";
import { useInfiniteScroll } from "@/hooks/ui/useInfiniteScroll";
import { FeedSkeleton, InfiniteScrollSkeleton } from "./skeletons";

export interface AllTabContentProps {
    points?: any[];
    viewpoints?: any[];
    isLoading: boolean;
    viewpointsLoading: boolean;
    combinedFeed: any[];
    basePath: string;
    space: string;
    setNegatedPointId: (id: number) => void;
    login: () => void;
    user: any;
    pinnedPoint?: any;
    loginOrMakePoint: () => void;
    handleNewViewpoint: () => void;
    handleCardClick: (id: string) => void;
    loadingCardId: string | null;
    onPrefetchPoint: (id: number) => void;
    selectedPointIds: number[];
    matchType: "any" | "all";
    topicFilters: string[];
    filtersOpen: boolean;
    onPointSelect: (pointId: number) => void;
    onPointDeselect: (pointId: number) => void;
    onClearAll: () => void;
    onMatchTypeChange: (type: "any" | "all") => void;
    onTopicFiltersChange: (filters: string[]) => void;
    onRefetchFeed?: () => void;
    isRefetching?: boolean;
}

export const AllTabContent = memo(({
    points,
    viewpoints,
    isLoading,
    viewpointsLoading,
    combinedFeed,
    basePath,
    space,
    setNegatedPointId,
    login,
    user,
    pinnedPoint,
    loginOrMakePoint,
    handleNewViewpoint,
    handleCardClick,
    loadingCardId,
    onPrefetchPoint,
    selectedPointIds,
    matchType,
    topicFilters,
    filtersOpen,
    onPointSelect,
    onPointDeselect,
    onClearAll,
    onMatchTypeChange,
    onTopicFiltersChange,
    onRefetchFeed,
    isRefetching = false,
}: AllTabContentProps) => {
    const [visibleCount, setVisibleCount] = useState(20);
    const visibleItems = useMemo(() => combinedFeed.slice(0, visibleCount), [combinedFeed, visibleCount]);

    const loadMore = useCallback(() => {
        setVisibleCount(c => Math.min(c + 20, combinedFeed.length));
    }, [combinedFeed.length]);

    const sentinelRef = useInfiniteScroll(loadMore, [combinedFeed.length]);

    if (isLoading || viewpointsLoading) {
        return <FeedSkeleton count={12} pointRatio={0.7} />;
    }

    const hasActiveFilters = selectedPointIds.length > 0 || topicFilters.length > 0;

    if ((!points || points.length === 0) && (!viewpoints || viewpoints.length === 0)) {
        return (
            <div className="flex flex-col flex-grow items-center justify-center gap-4 py-12 text-center min-h-[50vh]">
                <span className="text-muted-foreground">Nothing here yet</span>
                <div className="flex items-center justify-center gap-3">
                    <Button variant="outline" onClick={loginOrMakePoint} className="rounded-full flex items-center gap-2 px-6 font-bold border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-300 dark:border-green-800 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900">
                        <span>Make a Point</span>
                        <PlusIcon className="size-4" />
                    </Button>
                    <span className="text-muted-foreground">or</span>
                    <Button variant="outline" onClick={handleNewViewpoint} className="rounded-full flex items-center gap-2 px-6 font-bold border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900">
                        <span>Create Rationale</span>
                        <ViewpointIcon className="size-4" />
                    </Button>
                    {onRefetchFeed && (
                        <>
                            <span className="text-muted-foreground">or</span>
                            <Button
                                variant="outline"
                                onClick={onRefetchFeed}
                                disabled={isRefetching}
                                className="rounded-full flex items-center gap-2 px-6"
                            >
                                <RefreshCwIcon className={`size-4 ${isRefetching ? 'animate-spin' : ''}`} />
                                <span>{isRefetching ? 'Refreshing...' : 'Refresh Feed'}</span>
                            </Button>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <>
            {hasActiveFilters && (
                <div className="px-4 py-3 bg-muted/30 border-b">
                    <div className="text-sm text-muted-foreground">
                        Active filters applied - showing filtered results
                    </div>
                </div>
            )}

            {visibleItems.map((item: any) => (
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
                    onPrefetchPoint={onPrefetchPoint}
                />
            ))}
            {visibleCount < combinedFeed.length && (
                <div ref={sentinelRef}>
                    <InfiniteScrollSkeleton type="mixed" count={3} />
                </div>
            )}
        </>
    );
});

AllTabContent.displayName = 'AllTabContent'; 