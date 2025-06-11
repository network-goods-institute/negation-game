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