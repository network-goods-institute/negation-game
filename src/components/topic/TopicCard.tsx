"use client";

import React, { useState, useRef, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
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
}

export function TopicCard({
    topic,
    spaceId,
    className,
    size = "md",
    loading = false,
    onLoadingChange
}: TopicCardProps) {
    const isLoading = loading;
    const [isOpen, setIsOpen] = useState(false);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isMobile = useIsMobile();

    const { data: latestViewpoint } = useLatestViewpointByTopic(
        spaceId,
        topic.id,
        !isMobile
    );

    const sizeClasses = {
        sm: "min-h-24 text-sm w-80",
        md: "min-h-28 text-base w-80",
        lg: "min-h-32 text-lg w-80"
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
        if (!isOpen) {
            setIsOpen(true);
        }
    }, [isOpen, isMobile]);

    const handleHoverEnd = useCallback(() => {
        if (isMobile) return;
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
        hoverTimeoutRef.current = setTimeout(() => {
            setIsOpen(false);
        }, 100);
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
        <Popover open={isOpen} onOpenChange={(open) => { if (!open) setIsOpen(false); }}>
            <PopoverTrigger asChild>
                <Link href={href} className="block" prefetch={false}>
                    <Card
                        className={cn(
                            "group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 border-2 hover:border-primary/60 cursor-pointer bg-gradient-to-br from-background to-muted/20",
                            sizeClasses[size],
                            isLoading && "cursor-wait",
                            className
                        )}
                        onMouseEnter={handleHoverStart}
                        onMouseLeave={handleHoverEnd}
                    >
                        <CardContent className="p-5 h-full flex flex-col justify-center relative">
                            {isLoading && (
                                <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center rounded-lg">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                </div>
                            )}

                            <h3 className="font-bold text-xl group-hover:text-primary transition-colors duration-300 mb-3 leading-tight">
                                {topic.name}
                            </h3>

                            <div className="text-sm text-muted-foreground/80 space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    {typeof topic.rationalesCount === "number" && (
                                        <span className="font-medium text-foreground/70">{topic.rationalesCount} rationale{topic.rationalesCount === 1 ? "" : "s"}</span>
                                    )}
                                    {topic.latestRationaleAt && (
                                        <>
                                            {typeof topic.rationalesCount === "number" && <span className="text-muted-foreground/40">&middot;</span>}
                                            <span>
                                                Last {formatDistanceToNow(new Date(topic.latestRationaleAt), { addSuffix: true })}
                                            </span>
                                        </>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    {topic.earliestRationaleAt && (
                                        <span>
                                            Created {formatEarliest(topic.earliestRationaleAt)}
                                        </span>
                                    )}
                                    {topic.latestAuthorUsername && (
                                        <>
                                            {topic.earliestRationaleAt && <span className="text-muted-foreground/40">&middot;</span>}
                                            <span>Latest by <span className="font-medium text-foreground/70">{topic.latestAuthorUsername}</span></span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </PopoverTrigger>

            <PopoverContent className="w-80 p-0 shadow-xl border-2" side="top" align="start">
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