"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

interface ViewpointCardSkeletonProps {
    className?: string;
}

export function ViewpointCardSkeleton({ className }: ViewpointCardSkeletonProps) {
    return (
        <div className={cn(
            "border-b bg-card hover:bg-accent/50 transition-colors duration-150",
            className
        )}>
            <div className="p-6 space-y-4">
                {/* Header with topic */}
                <div className="flex items-center gap-2 mb-3">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-3 w-20" />
                </div>

                {/* Title */}
                <div className="space-y-2">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-4/5" />
                </div>

                {/* Description preview */}
                <div className="space-y-2 mt-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-4/5" />
                </div>

                {/* Metadata row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 gap-3">
                    <div className="flex items-center gap-4">
                        {/* Author */}
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-6 w-6 rounded-full" />
                            <Skeleton className="h-4 w-20" />
                        </div>

                        {/* Timestamp */}
                        <Skeleton className="h-3 w-16" />
                    </div>

                    {/* Statistics - hide some on mobile */}
                    <div className="flex items-center gap-2 sm:gap-4">
                        <div className="flex items-center gap-1">
                            <Skeleton className="h-4 w-4 rounded" />
                            <Skeleton className="h-3 w-8" />
                        </div>
                        <div className="flex items-center gap-1">
                            <Skeleton className="h-4 w-4 rounded" />
                            <Skeleton className="h-3 w-8" />
                        </div>
                        <div className="hidden sm:flex items-center gap-1">
                            <Skeleton className="h-4 w-4 rounded" />
                            <Skeleton className="h-3 w-12" />
                        </div>
                    </div>
                </div>

                {/* Point previews */}
                <div className="space-y-2 pt-3">
                    <Skeleton className="h-3 w-32" />
                    <div className="space-y-1">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-3/4" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export function ViewpointFeedSkeleton({ count = 6 }: { count?: number }) {
    return (
        <div className="divide-y">
            {Array.from({ length: count }).map((_, i) => (
                <ViewpointCardSkeleton key={i} />
            ))}
        </div>
    );
} 