import React from "react";
import { cn } from "@/lib/utils/cn";

export interface ObjectionHeaderSkeletonProps {
  className?: string;
}
export const ObjectionHeaderSkeleton: React.FC<ObjectionHeaderSkeletonProps> = ({
  className
}) => {
  return (
    <div
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-sm animate-pulse",
        "bg-red-50/60 border border-red-300/50 text-red-600/40",
        "dark:bg-red-950/60 dark:border-red-700/50 dark:text-red-400/40",
        className
      )}
    >
      {/* Parent point skeleton */}
      <div className="h-3 w-16 bg-current rounded opacity-60" />

      {/* Separator */}
      <span className="mx-2 opacity-60">/</span>

      {/* Objection point skeleton */}
      <div className="h-3 w-20 bg-current rounded opacity-60" />
    </div>
  );
};

export default ObjectionHeaderSkeleton;