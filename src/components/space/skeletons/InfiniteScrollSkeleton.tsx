"use client";

import React from "react";
import { PointCardSkeleton } from "./PointCardSkeleton";
import { ViewpointCardSkeleton } from "./ViewpointCardSkeleton";

interface InfiniteScrollSkeletonProps {
    type?: "mixed" | "points" | "viewpoints";
    count?: number;
}

export function InfiniteScrollSkeleton({ type = "mixed", count = 3 }: InfiniteScrollSkeletonProps) {
    if (type === "points") {
        return (
            <div className="divide-y">
                {Array.from({ length: count }).map((_, i) => (
                    <PointCardSkeleton key={`load-more-point-${i}`} />
                ))}
            </div>
        );
    }

    if (type === "viewpoints") {
        return (
            <div className="divide-y">
                {Array.from({ length: count }).map((_, i) => (
                    <ViewpointCardSkeleton key={`load-more-viewpoint-${i}`} />
                ))}
            </div>
        );
    }

    // Mixed type - alternate between points and viewpoints
    return (
        <div className="divide-y">
            {Array.from({ length: count }).map((_, i) => (
                i % 2 === 0 ? (
                    <PointCardSkeleton key={`load-more-mixed-${i}`} />
                ) : (
                    <ViewpointCardSkeleton key={`load-more-mixed-${i}`} />
                )
            ))}
        </div>
    );
} 