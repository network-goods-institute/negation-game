"use client";

import React, { memo, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon } from "lucide-react";
import { FeedItem } from "./FeedItem";
import { useInfiniteScroll } from "@/hooks/ui/useInfiniteScroll";
import { PointFeedSkeleton, InfiniteScrollSkeleton } from "./skeletons";
import { MakePointButton } from "@/components/space/action-buttons";

export interface PointsTabContentProps {
    points?: any[];
    isLoading: boolean;
    combinedFeed: any[];
    basePath: string;
    space: string;
    setNegatedPointId: (id: number) => void;
    login: () => void;
    user: any;
    pinnedPoint: any;
    loginOrMakePoint: () => void;
    handleCardClick: (id: string) => void;
    loadingCardId: string | null;
    onPrefetchPoint: (id: number) => void;
    onRefetchFeed?: () => void;
    isRefetching?: boolean;
}

export const PointsTabContent = memo(({
    points,
    isLoading,
    combinedFeed,
    basePath,
    space,
    setNegatedPointId,
    login,
    user,
    pinnedPoint,
    loginOrMakePoint,
    handleCardClick,
    loadingCardId,
    onPrefetchPoint,
    onRefetchFeed,
    isRefetching = false
}: PointsTabContentProps) => {
    const pointItems = useMemo(
        () => combinedFeed.filter((item: any) => item.type === 'point'),
        [combinedFeed]
    );
    const [visibleCount, setVisibleCount] = useState(20);
    const visibleItems = useMemo(
        () => pointItems.slice(0, visibleCount),
        [pointItems, visibleCount]
    );

    const loadMore = useCallback(() => {
        setVisibleCount(c => Math.min(c + 20, pointItems.length));
    }, [pointItems.length]);

    const sentinelRef = useInfiniteScroll(loadMore, [pointItems.length]);

    if (isLoading) {
        return <PointFeedSkeleton count={10} />;
    }

    if (points?.length === 0 && !pinnedPoint && pointItems.length === 0) {
        return (
            <div className="flex flex-col flex-grow items-center justify-center gap-4 py-12 text-center min-h-[50vh]">
                <span className="text-muted-foreground">Nothing here yet</span>
                <div className="flex gap-2">
                    <MakePointButton onClick={loginOrMakePoint} />
                    {onRefetchFeed && (
                        <Button
                            variant="outline"
                            onClick={onRefetchFeed}
                            disabled={isRefetching}
                        >
                            <RefreshCwIcon className={`mr-2 size-4 ${isRefetching ? 'animate-spin' : ''}`} />
                            {isRefetching ? 'Refreshing...' : 'Refresh Feed'}
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <>
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
            {visibleCount < pointItems.length && (
                <div ref={sentinelRef}>
                    <InfiniteScrollSkeleton type="points" count={3} />
                </div>
            )}
        </>
    );
});

PointsTabContent.displayName = 'PointsTabContent'; 