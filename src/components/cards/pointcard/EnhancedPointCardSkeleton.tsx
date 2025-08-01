import React from "react";
import { cn } from "@/lib/utils/cn";
import { ObjectionHeaderSkeleton } from "./ObjectionHeaderSkeleton";

export interface EnhancedPointCardSkeletonProps {
  className?: string;
  showBadge?: boolean;
  showObjectionHeader?: boolean;
  badgeVariant?: 'gold' | 'blue' | 'loading';
}
export const EnhancedPointCardSkeleton: React.FC<EnhancedPointCardSkeletonProps> = ({
  className,
  showBadge = true,
  showObjectionHeader = false,
  badgeVariant = 'gold'
}) => {
  return (
    <div className={cn("relative bg-background border-b p-4 animate-pulse", className)}>
      {/* Objection Header */}
      {showObjectionHeader && (
        <div className="mb-2">
          <ObjectionHeaderSkeleton />
        </div>
      )}

      {/* Content Area */}
      <div className="space-y-3">
        {/* Main content lines */}
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-full opacity-60" />
          <div className="h-4 bg-muted rounded w-4/5 opacity-50" />
          <div className="h-4 bg-muted rounded w-3/5 opacity-40" />
        </div>

        {/* Metadata row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Author */}
            <div className="h-3 bg-muted/60 rounded w-16" />
            {/* Timestamp */}
            <div className="h-3 bg-muted/50 rounded w-12" />
          </div>

          {/* Stats */}
          <div className="flex items-center space-x-2">
            <div className="h-3 bg-muted/60 rounded w-8" />
            <div className="h-3 bg-muted/50 rounded w-8" />
          </div>
        </div>

        {/* Action buttons row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Action buttons */}
            <div className="h-6 w-6 bg-muted/50 rounded" />
            <div className="h-6 w-6 bg-muted/50 rounded" />
            <div className="h-6 w-6 bg-muted/50 rounded" />
          </div>

          {/* Favor section */}
          <div className="flex items-center space-x-1">
            <div className="h-3 bg-muted/60 rounded w-8" />
            <div className="h-2 bg-muted/40 rounded w-16" />
          </div>
        </div>

        {/* Favor bar */}
        <div className="h-1 bg-muted/30 rounded-full w-full" />
      </div>
    </div>
  );
};

export default EnhancedPointCardSkeleton;