"use client";

import React, { memo, useMemo, useState, useCallback } from "react";
import { Loader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { FeedItem } from "./FeedItem";
import { useInfiniteScroll } from "@/hooks/ui/useInfiniteScroll";

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
    onPrefetchPoint
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
        return (
            <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-200px)]">
                <Loader className="h-6 w-6" />
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
                <div className="flex justify-center my-4" ref={sentinelRef}>
                    <Loader className="h-6 w-6" />
                </div>
            )}
        </>
    );
});

PointsTabContent.displayName = 'PointsTabContent'; 