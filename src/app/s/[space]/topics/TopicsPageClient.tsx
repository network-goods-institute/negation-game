"use client";

import React, { useState, useMemo } from "react";
import { ArrowLeftIcon, Search, Filter } from "lucide-react";
import Link from "next/link";
import { TopicCard } from "@/components/topic/TopicCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { usePrivy } from "@privy-io/react-auth";
import { useUserTopicRationales } from "@/queries/topics/useUserTopicRationales";

interface Topic {
    id: number;
    name: string;
    discourseUrl?: string | null;
    rationalesCount?: number | null;
    latestRationaleAt?: Date | null;
    earliestRationaleAt?: Date | null;
    latestAuthorUsername?: string | null;
}

interface TopicsPageClientProps {
    space: string;
    topics: Topic[];
}

export default function TopicsPageClient({ space, topics }: TopicsPageClientProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<"all" | "missing-my-rationales" | "has-my-rationales" | "missing-any-rationales" | "has-any-rationales">("all");
    const [sortBy, setSortBy] = useState<"name" | "rationales" | "recent">("name");
    const [filtersOpen, setFiltersOpen] = useState(false);

    const { user: privyUser } = usePrivy();
    const topicIds = useMemo(() => topics.map(topic => topic.id), [topics]);
    const { data: userTopicRationales, isLoading: userRationalesLoading } = useUserTopicRationales(privyUser?.id, topicIds);

    const filteredAndSortedTopics = useMemo(() => {
        let filtered = topics;

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(topic =>
                topic.name.toLowerCase().includes(query)
            );
        }

        if (filterType === "missing-any-rationales") {
            filtered = filtered.filter(topic => !topic.rationalesCount || topic.rationalesCount === 0);
        } else if (filterType === "has-any-rationales") {
            filtered = filtered.filter(topic => topic.rationalesCount && topic.rationalesCount > 0);
        } else if (filterType === "missing-my-rationales" && userTopicRationales) {
            const myRationaleTopicIds = new Set(userTopicRationales);
            filtered = filtered.filter(topic => !myRationaleTopicIds.has(topic.id));
        } else if (filterType === "has-my-rationales" && userTopicRationales) {
            const myRationaleTopicIds = new Set(userTopicRationales);
            filtered = filtered.filter(topic => myRationaleTopicIds.has(topic.id));
        }

        filtered.sort((a, b) => {
            switch (sortBy) {
                case "rationales":
                    return (b.rationalesCount || 0) - (a.rationalesCount || 0);
                case "recent":
                    if (!a.latestRationaleAt && !b.latestRationaleAt) return 0;
                    if (!a.latestRationaleAt) return 1;
                    if (!b.latestRationaleAt) return -1;
                    return new Date(b.latestRationaleAt).getTime() - new Date(a.latestRationaleAt).getTime();
                case "name":
                default:
                    return a.name.localeCompare(b.name);
            }
        });

        return filtered;
    }, [topics, searchQuery, filterType, sortBy, userTopicRationales]);

    const missingAnyRationalesCount = topics.filter(topic => !topic.rationalesCount || topic.rationalesCount === 0).length;
    const hasAnyRationalesCount = topics.filter(topic => topic.rationalesCount && topic.rationalesCount > 0).length;

    const { missingMyRationalesCount, hasMyRationalesCount } = useMemo(() => {
        if (!userTopicRationales) return { missingMyRationalesCount: 0, hasMyRationalesCount: 0 };

        const myRationaleTopicIds = new Set(userTopicRationales);
        const missing = topics.filter(topic => !myRationaleTopicIds.has(topic.id)).length;
        const has = topics.filter(topic => myRationaleTopicIds.has(topic.id)).length;

        return { missingMyRationalesCount: missing, hasMyRationalesCount: has };
    }, [topics, userTopicRationales]);

    const contentHeight = `${Math.max(filteredAndSortedTopics.length * 150 + 600, 1000)}px`;

    return (
        <div
            className="flex-1 flex bg-muted/30 min-h-0 overflow-y-auto"
            style={{ minHeight: contentHeight }}
        >
            {/* Left negative space (hidden on mobile) */}
            <div
                className="hidden sm:block flex-[2] max-w-[400px] bg-muted/10 dark:bg-muted/5 border-r border-border/50"
                style={{ minHeight: contentHeight }}
            ></div>

            {/* Center content */}
            <main
                className="relative w-full flex-[2] flex flex-col bg-background border-x border-border/50 shadow-lg"
                style={{ minHeight: contentHeight }}
            >
                {/* Sticky Header */}
                <div className="sticky top-0 z-20 bg-background border-b">
                    <div className="p-4 sm:p-6">
                        <div className="flex flex-col gap-4">
                            {/* Back button and title */}
                            <div className="flex items-center gap-4">
                                <Link href={`/s/${space}`}>
                                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                                        <ArrowLeftIcon className="h-4 w-4" />
                                        Back to {space === "global" ? "Global" : space}
                                    </Button>
                                </Link>
                                <div>
                                    <h1 className="text-2xl font-bold">Topics</h1>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                        <span>{topics.length} total</span>
                                        {privyUser && !userRationalesLoading && (
                                            <>
                                                {missingMyRationalesCount > 0 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {missingMyRationalesCount} need my rationale
                                                    </Badge>
                                                )}
                                                {hasMyRationalesCount > 0 && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        {hasMyRationalesCount} have my rationale
                                                    </Badge>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Search and filters row */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                {/* Search bar */}
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Search topics..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>

                                {/* Filter toggle button */}
                                <Button
                                    variant={filtersOpen ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setFiltersOpen(!filtersOpen)}
                                    className="flex items-center gap-2"
                                >
                                    <Filter className="h-4 w-4" />
                                    <span className="hidden sm:inline">Filters</span>
                                </Button>
                            </div>

                            {/* Filters panel */}
                            {filtersOpen && (
                                <div className="flex flex-col sm:flex-row gap-3 p-4 bg-muted/30 rounded-lg border">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-medium">Filter by rationales:</label>
                                        <Select value={filterType} onValueChange={(value: typeof filterType) => setFilterType(value)}>
                                            <SelectTrigger className="w-full sm:w-[180px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All topics</SelectItem>
                                                {privyUser && !userRationalesLoading && (
                                                    <>
                                                        <SelectItem value="missing-my-rationales">Missing my rationales ({missingMyRationalesCount})</SelectItem>
                                                        <SelectItem value="has-my-rationales">Has my rationales ({hasMyRationalesCount})</SelectItem>
                                                    </>
                                                )}
                                                <SelectItem value="missing-any-rationales">Missing any rationales ({missingAnyRationalesCount})</SelectItem>
                                                <SelectItem value="has-any-rationales">Has any rationales ({hasAnyRationalesCount})</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-medium">Sort by:</label>
                                        <Select value={sortBy} onValueChange={(value: typeof sortBy) => setSortBy(value)}>
                                            <SelectTrigger className="w-full sm:w-[180px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="name">Name (A-Z)</SelectItem>
                                                <SelectItem value="rationales">Number of rationales</SelectItem>
                                                <SelectItem value="recent">Most recent activity</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Topics list */}
                <div className="p-4 sm:p-6 pb-8">
                    {filteredAndSortedTopics.length === 0 ? (
                        <div className="text-center py-12">
                            {searchQuery.trim() || filterType !== "all" ? (
                                <>
                                    <p className="text-lg text-muted-foreground mb-2">
                                        No topics found
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {searchQuery.trim() && `No results for "${searchQuery}"`}
                                        {searchQuery.trim() && filterType !== "all" && " with "}
                                        {filterType === "missing-my-rationales" && "missing my rationales"}
                                        {filterType === "has-my-rationales" && "having my rationales"}
                                        {filterType === "missing-any-rationales" && "missing any rationales"}
                                        {filterType === "has-any-rationales" && "having any rationales"}
                                    </p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setSearchQuery("");
                                            setFilterType("all");
                                        }}
                                        className="mt-3"
                                    >
                                        Clear filters
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <p className="text-lg text-muted-foreground mb-2">
                                        No topics yet
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Topics will appear here when rationales are created
                                    </p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredAndSortedTopics.map((topic) => {
                                const hasUserRationale = userTopicRationales ? userTopicRationales.includes(topic.id) : false;
                                return (
                                    <TopicCard
                                        key={topic.id}
                                        topic={topic}
                                        spaceId={space}
                                        size="md"
                                        hasUserRationale={hasUserRationale}
                                        userRationalesLoaded={!userRationalesLoading}
                                    />
                                );
                            })}

                            {/* End of topics indicator */}
                            {filteredAndSortedTopics.length > 0 && (
                                <div className="text-center py-8 mt-8 border-t border-border/30">
                                    <p className="text-sm text-muted-foreground">
                                        That&apos;s all {filteredAndSortedTopics.length} topic{filteredAndSortedTopics.length === 1 ? '' : 's'}
                                        {filterType !== "all" && " matching your filters"}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Right negative space (hidden on mobile) */}
            <div
                className="hidden sm:block flex-[2] max-w-[400px] bg-muted/10 dark:bg-muted/5 border-l border-border/50"
                style={{ minHeight: contentHeight }}
            ></div>
        </div>
    );
}