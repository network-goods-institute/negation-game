"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLinkIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { encodeId } from "@/lib/negation-game/encodeId";
import { useRouter } from "next/navigation";

interface TopicCardProps {
    topic: {
        id: number;
        name: string;
        discourseUrl?: string | null;
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
    const [internalLoading, setInternalLoading] = useState(false);
    const router = useRouter();

    const isLoading = loading || internalLoading;

    const sizeClasses = {
        sm: "min-h-24 text-sm",
        md: "w-48 h-48 text-base",
        lg: "w-64 h-64 text-lg"
    };

    const handleExternalLinkClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (topic.discourseUrl) {
            window.open(topic.discourseUrl, '_blank', 'noopener,noreferrer');
        }
    };

    const handleCardClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (isLoading) return;

        setInternalLoading(true);
        onLoadingChange?.(true);

        const href = `/s/${spaceId}/topic/${encodeId(topic.id)}`;
        router.push(href);
    };

    return (
        <div className="relative inline-block">
            <Card
                onClick={handleCardClick}
                className={cn(
                    "group relative overflow-hidden transition-all duration-200 hover:shadow-md border-2 hover:border-primary/50 cursor-pointer",
                    sizeClasses[size],
                    isLoading && "cursor-wait",
                    className
                )}
            >
                <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center">
                    <h3 className="font-bold text-foreground group-hover:text-primary transition-colors duration-200 line-clamp-3">
                        {topic.name}
                    </h3>

                    {!isLoading && (
                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    )}

                    {isLoading && (
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                <span className="text-xs text-muted-foreground">Loading...</span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {topic.discourseUrl && (
                <button
                    onClick={handleExternalLinkClick}
                    disabled={isLoading}
                    className={cn(
                        "absolute top-2 right-2 p-1.5 bg-background/90 backdrop-blur-sm rounded-full border border-border hover:bg-background hover:border-primary/50 transition-all duration-200 z-10 shadow-sm",
                        isLoading && "opacity-50 cursor-not-allowed"
                    )}
                    title={`Related discussion: ${topic.discourseUrl.replace(/^(https?:\/\/)?(www\.)?/i, '')}`}
                >
                    <ExternalLinkIcon className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors duration-200" />
                </button>
            )}
        </div>
    );
} 