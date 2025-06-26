"use client";

import React, { memo, useState, useMemo, useCallback } from "react";
import { Loader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { ViewpointIcon } from "@/components/icons/AppIcons";
import { FeedItem } from "@/components/space/FeedItem";
import { useInfiniteScroll } from "@/hooks/ui/useInfiniteScroll";

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
}: AllTabContentProps) => {
    const [visibleCount, setVisibleCount] = useState(20);
    const visibleItems = useMemo(() => combinedFeed.slice(0, visibleCount), [combinedFeed, visibleCount]);

    const loadMore = useCallback(() => {
        setVisibleCount(c => Math.min(c + 20, combinedFeed.length));
    }, [combinedFeed.length]);

    const sentinelRef = useInfiniteScroll(loadMore, [combinedFeed.length]);

    if (!points || !viewpoints || isLoading || viewpointsLoading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-200px)]">
                <Loader className="h-6 w-6" />
            </div>
        );
    }

    const hasActiveFilters = selectedPointIds.length > 0 || topicFilters.length > 0;

    if (points.length === 0 && viewpoints.length === 0) {
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
                <div className="flex justify-center my-4" ref={sentinelRef}>
                    <Loader className="h-6 w-6" />
                </div>
            )}
        </>
    );
});

AllTabContent.displayName = 'AllTabContent'; 