"use client";

import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { useTopics } from "@/queries/topics/useTopics";
import { useUserTopicRationales } from "@/queries/topics/useUserTopicRationales";
import { TopicCard } from "@/components/topic/TopicCard";
import useIsMobile from "@/hooks/ui/useIsMobile";
import { X, Search, ArrowRight } from "lucide-react";
import { TopicGridSkeleton } from "./skeletons";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface SpacePageAsideProps {
    spaceId: string;
    handleNewViewpoint: () => void;
    isNewRationaleLoading?: boolean;
    setIsSelectNegationOpen: (open: boolean) => void;
    topicsOpen?: boolean;
}

export function SpacePageAside({
    spaceId,
    handleNewViewpoint,
    isNewRationaleLoading = false,
    topicsOpen = false,
}: SpacePageAsideProps) {
    const { data: topics, isLoading: topicsLoading } = useTopics(spaceId);
    const { user: privyUser } = usePrivy();
    const isMobile = useIsMobile();
    const [topicSearch, setTopicSearch] = useState("");
    const [loadingTopicId, setLoadingTopicId] = useState<number | null>(null);

    const topicIds = useMemo(() => topics?.map(t => t.id) || [], [topics]);
    const { data: userRationaleTopicIds, isLoading: userRationalesLoading } = useUserTopicRationales(privyUser?.id, topicIds);

    const filteredTopics = useMemo(() => {
        if (!topics) return [];
        if (!topicSearch.trim()) return topics;
        return topics.filter(topic =>
            topic.name.toLowerCase().includes(topicSearch.toLowerCase())
        );
    }, [topics, topicSearch]);

    const handleTopicClick = (topicId: number) => {
        setLoadingTopicId(topicId);
        setTimeout(() => setLoadingTopicId(null), 1000);
    };

    if (isMobile && !topicsOpen) {
        return null;
    }

    return (
        <>
            {/* Mobile full screen overlay */}
            {isMobile && topicsOpen && (
                <div className="fixed inset-0 z-50 bg-background animate-in slide-in-from-right duration-300">
                    <div className="flex flex-col h-full">
                        {/* Header with close button */}
                        <div className="flex items-center justify-between p-4 border-b">
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-semibold text-foreground">Topics</h2>
                                {userRationalesLoading && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                                        <span>Loading...</span>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    // This will be handled by the parent component
                                    window.dispatchEvent(new CustomEvent('closeTopics'));
                                }}
                                className="p-2 hover:bg-accent rounded-md"
                                aria-label="Close topics"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    {/* Topic Search */}
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search topics..."
                                            value={topicSearch}
                                            onChange={(e) => setTopicSearch(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>

                                    {topicsLoading ? (
                                        <TopicGridSkeleton count={6} size="sm" />
                                    ) : filteredTopics && filteredTopics.length > 0 ? (
                                        <div className="flex flex-col gap-2">
                                            {filteredTopics.map((topic) => (
                                                <div key={topic.id} onClick={() => handleTopicClick(topic.id)}>
                                                    <TopicCard
                                                        topic={topic}
                                                        spaceId={spaceId}
                                                        size="sm"
                                                        loading={loadingTopicId === topic.id}
                                                        hasUserRationale={userRationaleTopicIds?.includes(topic.id)}
                                                        userRationalesLoaded={!userRationalesLoading}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <p className="text-sm">
                                                {topicSearch.trim() ? 'No topics found' : 'No topics yet'}
                                            </p>
                                            <p className="text-xs mt-1">
                                                {topicSearch.trim() ? 'Try a different search term' : 'Topics will appear here as they are created'}
                                            </p>
                                        </div>
                                    )}

                                    {/* View All Topics Link - Mobile */}
                                    <div className="pt-4 border-t">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full"
                                            asChild
                                        >
                                            <Link href={`/s/${spaceId}/topics`} className="flex items-center gap-2">
                                                View All Topics
                                                <ArrowRight className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Desktop sidebar */}
            {!isMobile && (
                <aside className="hidden sm:flex flex-col p-6 gap-6 border-l overflow-y-auto">
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-foreground">Topics</h2>
                                {userRationalesLoading && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                                        <span>Loading your progress...</span>
                                    </div>
                                )}
                            </div>

                            {/* Topic Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search topics..."
                                    value={topicSearch}
                                    onChange={(e) => setTopicSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            {topicsLoading ? (
                                <TopicGridSkeleton count={6} size="sm" />
                            ) : filteredTopics && filteredTopics.length > 0 ? (
                                <div className="flex flex-col gap-2">
                                    {filteredTopics.map((topic) => (
                                        <div key={topic.id} onClick={() => handleTopicClick(topic.id)}>
                                            <TopicCard
                                                topic={topic}
                                                spaceId={spaceId}
                                                size="sm"
                                                loading={loadingTopicId === topic.id}
                                                hasUserRationale={userRationaleTopicIds?.includes(topic.id)}
                                                userRationalesLoaded={!userRationalesLoading}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p className="text-sm">
                                        {topicSearch.trim() ? 'No topics found' : 'No topics yet'}
                                    </p>
                                    <p className="text-xs mt-1">
                                        {topicSearch.trim() ? 'Try a different search term' : 'Topics will appear here as they are created'}
                                    </p>
                                </div>
                            )}

                            {/* View All Topics Link - Desktop */}
                            <div className="pt-4 border-t">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    asChild
                                >
                                    <Link href={`/s/${spaceId}/topics`} className="flex items-center gap-2">
                                        View All Topics
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </aside>
            )}
        </>
    );
} 