"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

interface PointCardSkeletonProps {
    className?: string;
    isPriority?: boolean;
    isPinned?: boolean;
}

export function PointCardSkeleton({ className, isPriority, isPinned }: PointCardSkeletonProps) {
    return (
        <div className={cn(
            "flex border-b cursor-pointer hover:bg-accent transition-colors duration-150",
            className
        )}>
            <div className="flex-grow p-6 space-y-4">
                {/* Priority/Pinned indicator */}
                {(isPriority || isPinned) && (
                    <div className="flex items-center gap-2 mb-3">
                        <Skeleton className="h-3 w-3 rounded-full" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                )}

                {/* Content area */}
                <div className="space-y-3">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-4/5" />
                    <Skeleton className="h-5 w-3/5" />
                </div>

                {/* Metadata row */}
                <div className="flex items-center justify-between pt-3">
                    <div className="flex items-center gap-4">
                        {/* Author */}
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-6 w-6 rounded-full" />
                            <Skeleton className="h-4 w-16" />
                        </div>

                        {/* Timestamp */}
                        <Skeleton className="h-3 w-12" />
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                            <Skeleton className="h-5 w-5 rounded" />
                            <Skeleton className="h-4 w-8" />
                        </div>
                        <div className="flex items-center gap-1">
                            <Skeleton className="h-5 w-5 rounded" />
                            <Skeleton className="h-4 w-8" />
                        </div>
                        <div className="flex items-center gap-1">
                            <Skeleton className="h-5 w-5 rounded" />
                            <Skeleton className="h-4 w-8" />
                        </div>
                    </div>
                </div>

                {/* Favor bar */}
                <div className="pt-2">
                    <Skeleton className="h-2 w-full rounded-full" />
                </div>
            </div>
        </div>
    );
}

export function PointFeedSkeleton({ count = 8 }: { count?: number }) {
    return (
        <div className="divide-y">
            {Array.from({ length: count }).map((_, i) => (
                <PointCardSkeleton key={i} />
            ))}
        </div>
    );
}

export function PriorityPointsSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div className="border-b bg-gradient-to-r from-amber-50/30 via-orange-50/20 to-amber-50/30 dark:from-amber-950/20 dark:via-orange-950/10 dark:to-amber-950/20">
            <div className="px-6 py-4 border-b border-amber-200/50 dark:border-amber-800/30">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Skeleton className="w-3 h-3 rounded-full" />
                        <Skeleton className="h-5 w-32" />
                    </div>
                    <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-3 w-64 mt-1" />
            </div>
            <div className="divide-y divide-amber-200/30 dark:divide-amber-800/20">
                {Array.from({ length: count }).map((_, i) => (
                    <PointCardSkeleton key={i} isPriority />
                ))}
            </div>
        </div>
    );
} 