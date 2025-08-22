"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

interface TopicCardSkeletonProps {
    size?: "sm" | "md" | "lg";
    className?: string;
}

export function TopicCardSkeleton({ size = "md", className }: TopicCardSkeletonProps) {
    const sizeClasses = {
        sm: "h-24",
        md: "h-28",
        lg: "h-32"
    };

    return (
        <div
            data-testid="topic-card-skeleton"
            className={cn(
                "relative w-full rounded-lg border border-border/50 bg-card",
                sizeClasses[size],
                className
            )}
        >
            <div className="p-3 h-full flex flex-col justify-between">
                <div className="space-y-2 flex-1">
                    {/* Topic title */}
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />

                    {/* Rationale count */}
                    <Skeleton className="h-3 w-20" />
                </div>

                {/* Timestamp */}
                <Skeleton className="h-3 w-16 mt-auto" />
            </div>
        </div>
    );
}

export function TopicGridSkeleton({ count = 6, size = "md" }: { count?: number; size?: "sm" | "md" | "lg" }) {
    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {Array.from({ length: count }).map((_, i) => (
                <TopicCardSkeleton key={i} size={size} />
            ))}
        </div>
    );
} 