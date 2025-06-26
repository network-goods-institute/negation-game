"use client";

import React from "react";
import { PointCardSkeleton } from "./PointCardSkeleton";
import { ViewpointCardSkeleton } from "./ViewpointCardSkeleton";

interface FeedSkeletonProps {
    count?: number;
    pointRatio?: number;
}

export function FeedSkeleton({ count = 10, pointRatio = 0.6 }: FeedSkeletonProps) {
    const items = Array.from({ length: count }).map((_, i) => {
        const isPoint = (i + 1) / count <= pointRatio || (i % 3 !== 2);
        return { id: i, type: isPoint ? 'point' : 'viewpoint' };
    });

    return (
        <div className="divide-y">
            {items.map((item) => (
                item.type === 'point' ? (
                    <PointCardSkeleton key={`point-${item.id}`} />
                ) : (
                    <ViewpointCardSkeleton key={`viewpoint-${item.id}`} />
                )
            ))}
        </div>
    );
}

export function TabContentSkeleton({
    type,
    count = 8
}: {
    type: "all" | "points" | "rationales";
    count?: number;
}) {
    return (
        <div className="flex-1 min-h-[calc(100vh-200px)]">
            {type === "all" && <FeedSkeleton count={count} pointRatio={0.7} />}
            {type === "points" && (
                <div className="divide-y">
                    {Array.from({ length: count }).map((_, i) => (
                        <PointCardSkeleton key={`points-skeleton-${i}`} />
                    ))}
                </div>
            )}
            {type === "rationales" && (
                <div className="divide-y">
                    {Array.from({ length: count }).map((_, i) => (
                        <ViewpointCardSkeleton key={`viewpoints-skeleton-${i}`} />
                    ))}
                </div>
            )}
        </div>
    );
} 