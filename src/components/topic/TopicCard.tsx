"use client";

import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { encodeId } from "@/lib/negation-game/encodeId";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLatestViewpointByTopic } from "@/queries/viewpoints/useLatestViewpointByTopic";
import { ViewpointIcon } from "@/components/icons/AppIcons";
import useIsMobile from "@/hooks/ui/useIsMobile";

interface TopicCardProps {
    topic: {
        id: number;
        name: string;
        discourseUrl?: string | null;
        rationalesCount?: number | null;
        latestRationaleAt?: Date | null;
        earliestRationaleAt?: Date | null;
        latestAuthorUsername?: string | null;
    };
    spaceId: string;
    className?: string;
    size?: "sm" | "md" | "lg";
    loading?: boolean;
    onLoadingChange?: (loading: boolean) => void;
    hasUserRationale?: boolean;
    userRationalesLoaded?: boolean;
}

export function TopicCard({
    topic,
    spaceId,
    className,
    size = "md",
    loading = false,
    onLoadingChange,
    hasUserRationale = false,
    userRationalesLoaded = true
}: TopicCardProps) {
    const isLoading = loading;
    const [isOpen, setIsOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isMobile = useIsMobile();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const { data: latestViewpoint } = useLatestViewpointByTopic(
        spaceId,
        topic.id,
        !isMobile
    );

    const sizeClasses = {
        sm: "h-24 text-sm",
        md: "h-28 text-base",
        lg: "h-32 text-lg"
    };

    const href = `/s/${spaceId}/topic/${encodeId(topic.id)}`;

    const formatEarliest = (date: Date | string | null | undefined) => {
        if (!date) return null;
        try {
            return format(new Date(date), "MMM yyyy");
        } catch {
            return null;
        }
    };

    const handleHoverStart = useCallback(() => {
        if (isMobile) return;
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        hoverTimeoutRef.current = setTimeout(() => {
            setIsOpen(true);
        }, 150);
    }, [isMobile]);

    const handleHoverEnd = useCallback(() => {
        if (isMobile) return;
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
        hoverTimeoutRef.current = setTimeout(() => {
            setIsOpen(false);
        }, 150);
    }, [isMobile]);

    const stripMarkdown = useMemo(() => {
        if (!latestViewpoint?.description) return "";
        return latestViewpoint.description
            .replace(/#{1,6}\s+/g, '')
            .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
            .replace(/```[\s\S]*?```/g, '')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/^>\s+/gm, '')
            .replace(/^---+$/gm, '')
            .replace(/^[\s-]*[-+*]\s+/gm, '')
            .replace(/^\s*\d+\.\s+/gm, '')
            .replace(/<[^>]*>/g, '')
            .replace(/\n{2,}/g, '\n')
            .trim();
    }, [latestViewpoint?.description]);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Link href={href} className="block w-full" prefetch={false}>
                    <div
                        className={cn(
                            "group relative w-full rounded-lg border transition-all duration-200 cursor-pointer",
                            hasUserRationale
                                ? "border-green-500/50 bg-green-50 hover:bg-green-100 hover:border-green-500 dark:bg-green-950/30 dark:hover:bg-green-950/50 dark:border-green-400/50 dark:hover:border-green-400"
                                : "border-border/50 bg-card hover:bg-accent/50 hover:border-primary/50",
                            sizeClasses[size],
                            isLoading && "cursor-wait opacity-50",
                            className
                        )}
                        onMouseEnter={handleHoverStart}
                        onMouseLeave={handleHoverEnd}
                    >
                        <div className="p-3 h-full flex flex-col justify-between overflow-hidden">
                            {isLoading && (
                                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
                                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                </div>
                            )}

                            <div className="space-y-1 flex-1 min-h-0">
                                <div className="flex items-center gap-2">
                                    {/* Left aligned checkmark in circle */}
                                    <div className="flex-shrink-0" title={hasUserRationale ? "You already published a rationale for this topic" : "No rationale published yet"}>
                                        {hasUserRationale ? (
                                            <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                                                <Check className="w-3 h-3 text-white" />
                                            </div>
                                        ) : (
                                            <div className="w-5 h-5 border-2 border-muted-foreground rounded-full"></div>
                                        )}
                                    </div>
                                    <h3 className={cn(
                                        "font-semibold text-sm sm:text-base leading-tight line-clamp-1 transition-colors flex-1",
                                        hasUserRationale ? "text-green-800 group-hover:text-green-900 dark:text-green-200 dark:group-hover:text-green-100" : "group-hover:text-primary"
                                    )}>
                                        {topic.name}
                                    </h3>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        {typeof topic.rationalesCount === "number" && (
                                            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                                                {topic.rationalesCount} rationale{topic.rationalesCount === 1 ? "" : "s"}
                                            </p>
                                        )}
                                        {userRationalesLoaded && !hasUserRationale && (
                                            <p className="text-xs text-muted-foreground mt-0.5">Missing rationale</p>
                                        )}
                                    </div>
                                    {topic.latestRationaleAt && (
                                        <p className="text-xs text-muted-foreground/80 flex-shrink-0">
                                            {isMounted ? formatDistanceToNow(new Date(topic.latestRationaleAt), { addSuffix: true }) : format(new Date(topic.latestRationaleAt), "MMM d, yyyy")}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </Link>
            </PopoverTrigger>

            <PopoverContent
                className="w-80 p-0 shadow-xl border-2"
                side="bottom"
                align="start"
                onMouseEnter={handleHoverStart}
                onMouseLeave={handleHoverEnd}
            >
                <div className="p-4 border-b bg-gradient-to-r from-muted/30 to-muted/10">
                    <div className="flex items-center gap-2 mb-2">
                        <ViewpointIcon className="flex-shrink-0 text-primary" />
                        <span className="text-sm font-semibold text-foreground/80">Latest Rationale</span>
                    </div>
                    {latestViewpoint ? (
                        <>
                            <h4 className="font-bold text-base mb-1 leading-tight">{latestViewpoint.title}</h4>
                            <p className="text-sm text-muted-foreground/80">
                                by <span className="font-medium text-foreground/70">{latestViewpoint.authorUsername}</span> • {formatDistanceToNow(new Date(latestViewpoint.createdAt), { addSuffix: true })}
                            </p>
                        </>
                    ) : (
                        <>
                            <h4 className="font-bold text-base mb-1 text-muted-foreground/80">No rationales yet</h4>
                            <p className="text-sm text-muted-foreground/70">
                                Be the first to create a rationale for this topic
                            </p>
                        </>
                    )}
                </div>
                <div className="p-4 bg-background">
                    {latestViewpoint ? (
                        <>
                            <p className="text-sm text-foreground/90 line-clamp-4 leading-relaxed">
                                {stripMarkdown}
                            </p>
                            {latestViewpoint.statistics && (
                                <div className="flex gap-4 mt-3 text-xs text-muted-foreground/80">
                                    <span className="font-medium">{latestViewpoint.statistics.views} views</span>
                                    <span className="font-medium">{latestViewpoint.statistics.copies} copies</span>
                                    <span className="font-medium">{latestViewpoint.statistics.totalCred} cred</span>
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="text-sm text-muted-foreground/70 italic">
                            No content available yet. Create the first rationale to get started.
                        </p>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
} 