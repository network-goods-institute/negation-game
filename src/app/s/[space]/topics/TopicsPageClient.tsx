"use client";

import React, { useState, useMemo } from "react";
import { Search, Filter, Loader } from "lucide-react";
import { TopicCard } from "@/components/topic/TopicCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePrivy } from "@privy-io/react-auth";
import { useUserTopicRationales } from "@/queries/topics/useUserTopicRationales";
import { useAllTopics } from "@/queries/topics/useAllTopics";
import { SpaceLayout } from "@/components/layouts/SpaceLayout";
import { SpaceChildHeader } from "@/components/layouts/headers/SpaceChildHeader";
import { TopicCardSkeleton } from "@/components/space/skeletons";
import { Badge } from "@/components/ui/badge";

interface Topic {
    id: number;
    name: string;
    discourseUrl?: string | null;
    rationalesCount?: number | null;
    pointsCount?: number | null;
    latestRationaleAt?: Date | null;
    earliestRationaleAt?: Date | null;
    latestAuthorUsername?: string | null;
    closed?: boolean | null;
}

interface TopicsPageClientProps {
    space: string;
}

export default function TopicsPageClient({ space }: TopicsPageClientProps) {
    const { data: topics = [], isLoading: topicsLoading } = useAllTopics(space);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<"all" | "missing-my-rationales" | "has-my-rationales" | "missing-any-rationales" | "has-any-rationales" | "open" | "closed">("all");
    const [sortBy, setSortBy] = useState<"name" | "rationales" | "points" | "recent">("name");
    const [filtersOpen, setFiltersOpen] = useState(false);

    const { user: privyUser } = usePrivy();
    const topicIds = useMemo(() => topics.map(topic => topic.id), [topics]);
    const { data: userTopicRationales, isLoading: userRationalesLoading } = useUserTopicRationales(privyUser?.id, topicIds, space);

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
            filtered = filtered.filter(topic => !topic.closed && !myRationaleTopicIds.has(topic.id));
        } else if (filterType === "has-my-rationales" && userTopicRationales) {
            const myRationaleTopicIds = new Set(userTopicRationales);
            filtered = filtered.filter(topic => !topic.closed && myRationaleTopicIds.has(topic.id));
        } else if (filterType === "open") {
            filtered = filtered.filter(topic => !topic.closed);
        } else if (filterType === "closed") {
            filtered = filtered.filter(topic => topic.closed);
        }

        filtered.sort((a, b) => {
            switch (sortBy) {
                case "rationales":
                    return (b.rationalesCount || 0) - (a.rationalesCount || 0);
                case "points":
                    return (b.pointsCount || 0) - (a.pointsCount || 0);
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
    const openTopicsCount = topics.filter(topic => !topic.closed).length;
    const closedTopicsCount = topics.filter(topic => topic.closed).length;

    const { missingMyRationalesCount, hasMyRationalesCount } = useMemo(() => {
        if (!userTopicRationales) return { missingMyRationalesCount: 0, hasMyRationalesCount: 0 };

        const myRationaleTopicIds = new Set(userTopicRationales);
        const missing = topics.filter(topic => !myRationaleTopicIds.has(topic.id)).length;
        const has = topics.filter(topic => myRationaleTopicIds.has(topic.id)).length;

        return { missingMyRationalesCount: missing, hasMyRationalesCount: has };
    }, [topics, userTopicRationales]);

    const subtitle = useMemo(() => {
        const parts: string[] = [`${topics.length} total`];

        if (privyUser && !userRationalesLoading) {
            const openTopicsMissingMyRationale = topics.filter(topic => !topic.closed && !userTopicRationales?.includes(topic.id)).length;
            const openTopicsWithMyRationale = topics.filter(topic => !topic.closed && userTopicRationales?.includes(topic.id)).length;

            if (openTopicsMissingMyRationale > 0) {
                parts.push(`${openTopicsMissingMyRationale} need my rationale`);
            }
            if (openTopicsWithMyRationale > 0) {
                parts.push(`${openTopicsWithMyRationale} have my rationale`);
            }
        }

        return parts.join(' • ');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [topics.length, privyUser, userRationalesLoading, missingMyRationalesCount, topics, userTopicRationales]);

    const rightActions = (
        <Button
            variant={filtersOpen ? "default" : "outline"}
            size="sm"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="flex items-center gap-2"
        >
            <Filter className="h-4 w-4" />
            <span className="hidden lg:inline">Filters</span>
        </Button>
    );

    const header = (
        <div>
            <SpaceChildHeader
                title="Topics"
                subtitle={subtitle}
                backUrl={`/s/${space}`}
                rightActions={rightActions}
            />

            <div className="px-4 sm:px-6">
                {/* Search bar */}
                <div className="py-4 border-b">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search topics..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* Summary stats */}
                <div className="py-3 flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="outline">{topics.length} total</Badge>
                    <Badge variant="outline">{hasAnyRationalesCount} with rationales</Badge>
                    <Badge variant="outline">{missingAnyRationalesCount} without rationales</Badge>
                    {privyUser && !userRationalesLoading && (
                        <>
                            <Badge variant="outline">{topics.filter(topic => !topic.closed && userTopicRationales?.includes(topic.id)).length} have my rationale</Badge>
                            <Badge variant="outline">{topics.filter(topic => !topic.closed && !userTopicRationales?.includes(topic.id)).length} need my rationale</Badge>
                        </>
                    )}
                </div>

                {/* Quick filters */}
                <div className="py-3 border-b flex flex-wrap gap-2">
                    <Button size="sm" variant={filterType === "all" ? "default" : "outline"} onClick={() => setFilterType("all")}>All</Button>
                    {privyUser && !userRationalesLoading && (
                        <>
                            <Button size="sm" variant={filterType === "missing-my-rationales" ? "default" : "outline"} onClick={() => setFilterType("missing-my-rationales")}>
                                Missing my rationales ({topics.filter(topic => !topic.closed && !userTopicRationales?.includes(topic.id)).length})
                            </Button>
                            <Button size="sm" variant={filterType === "has-my-rationales" ? "default" : "outline"} onClick={() => setFilterType("has-my-rationales")}>
                                Has my rationales ({topics.filter(topic => !topic.closed && userTopicRationales?.includes(topic.id)).length})
                            </Button>
                        </>
                    )}
                    <Button size="sm" variant={filterType === "missing-any-rationales" ? "default" : "outline"} onClick={() => setFilterType("missing-any-rationales")}>Missing any</Button>
                    <Button size="sm" variant={filterType === "has-any-rationales" ? "default" : "outline"} onClick={() => setFilterType("has-any-rationales")}>Has any</Button>
                </div>

                {/* Filters panel */}
                {filtersOpen && (
                    <div className="py-4">
                        <div className="flex flex-col lg:flex-row gap-3 p-4 bg-muted/30 rounded-lg border">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium">Filter by rationales:</label>
                                <Select value={filterType} onValueChange={(value: typeof filterType) => setFilterType(value)}>
                                    <SelectTrigger className="w-full lg:w-[180px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All topics</SelectItem>
                                        {privyUser && !userRationalesLoading && (
                                            <>
                                                <SelectItem value="missing-my-rationales">Missing my rationales ({topics.filter(topic => !topic.closed && !userTopicRationales?.includes(topic.id)).length})</SelectItem>
                                                <SelectItem value="has-my-rationales">Has my rationales ({topics.filter(topic => !topic.closed && userTopicRationales?.includes(topic.id)).length})</SelectItem>
                                            </>
                                        )}
                                        <SelectItem value="missing-any-rationales">Missing any rationales ({missingAnyRationalesCount})</SelectItem>
                                        <SelectItem value="has-any-rationales">Has any rationales ({hasAnyRationalesCount})</SelectItem>
                                        <SelectItem value="open">Open topics ({openTopicsCount})</SelectItem>
                                        <SelectItem value="closed">Closed topics ({closedTopicsCount})</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium">Sort by:</label>
                                <Select value={sortBy} onValueChange={(value: typeof sortBy) => setSortBy(value)}>
                                    <SelectTrigger className="w-full lg:w-[180px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="name">Name (A-Z)</SelectItem>
                                        <SelectItem value="rationales">Number of rationales</SelectItem>
                                        <SelectItem value="points">Number of points</SelectItem>
                                        <SelectItem value="recent">Most recent activity</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <SpaceLayout
            space={space}
            header={header}
            showUserProfilePreview={true}
        >
            <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
                {topicsLoading ? (
                    Array.from({ length: 6 }).map((_, index) => (
                        <TopicCardSkeleton key={index} />
                    ))
                ) : filteredAndSortedTopics.length === 0 ? (
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
                                    {filterType === "open" && "open"}
                                    {filterType === "closed" && "closed"}
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
                        {userRationalesLoading ? (
                            Array.from({ length: Math.min(6, topics.length) }).map((_, index) => (
                                <TopicCardSkeleton key={index} />
                            ))
                        ) : (
                            filteredAndSortedTopics.map((topic) => {
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
                            })
                        )}

                        {/* End of topics indicator */}
                        {!userRationalesLoading && filteredAndSortedTopics.length > 0 && (
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
        </SpaceLayout>
    );
}
