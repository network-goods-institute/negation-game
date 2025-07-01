"use client";
import React, { useState, useMemo, useEffect } from "react";
import { ViewpointCardWrapper } from "@/components/cards/ViewpointCardWrapper";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, ChevronDownIcon, ChevronUpIcon, X, Check, ExternalLink, LayoutGrid } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { encodeId } from "@/lib/negation-game/encodeId";
import { Loader } from "@/components/ui/loader";
import useIsMobile from "@/hooks/ui/useIsMobile";
import { DeltaComparisonWidget } from "@/components/delta/DeltaComparisonWidget";
import { usePrivy } from "@privy-io/react-auth";
import { useAllUsers } from "@/queries/users/useAllUsers";
import { UsernameDisplay } from "@/components/ui/UsernameDisplay";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


interface Topic {
    id: number;
    name: string;
    discourseUrl?: string | null;
}

interface Viewpoint {
    id: string;
    title: string;
    description: string;
    authorId: string;
    authorUsername: string;
    createdAt: string;
    graph: any;
    space: string;
    statistics: {
        views: number;
        copies: number;
        totalCred: number;
        averageFavor: number;
    };
}

type SortKey = "recent" | "author" | "cred" | "favor" | "views" | "copies";

const sortFunctions: Record<SortKey, (a: Viewpoint, b: Viewpoint) => number> = {
    recent: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    author: (a, b) => a.authorUsername.localeCompare(b.authorUsername),
    cred: (a, b) => b.statistics.totalCred - a.statistics.totalCred,
    favor: (a, b) => b.statistics.averageFavor - a.statistics.averageFavor,
    views: (a, b) => b.statistics.views - a.statistics.views,
    copies: (a, b) => b.statistics.copies - a.statistics.copies,
};

interface TopicPageClientProps {
    topic: Topic;
    viewpoints: Viewpoint[];
    space: string;
}

export default function TopicPageClient({ topic, viewpoints, space }: TopicPageClientProps) {
    const router = useRouter();
    const isMobile = useIsMobile();
    const { user: privyUser } = usePrivy();
    const [viewpointsSortKey, setSortKey] = useState<SortKey>("recent");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
    const [isTopicsExpanded, setIsTopicsExpanded] = useState(false);
    const [isGlobalGraphLoading, setIsGlobalGraphLoading] = useState(false);

    const { data: allUsers } = useAllUsers();


    const sortedDelegates = useMemo(() => {
        if (!allUsers) return [];

        const delegatesWithStatus = allUsers.map(user => {
            const hasPublished = viewpoints.some(vp => vp.authorId === user.id);
            const reputation = user.cred || 50;
            return { ...user, hasPublished, reputation };
        });

        return delegatesWithStatus.sort((a, b) => {
            if (a.hasPublished === b.hasPublished) {
                return a.username.localeCompare(b.username);
            }
            return a.hasPublished ? -1 : 1;
        });
    }, [allUsers, viewpoints]);

    const hasCurrentUserRationale = viewpoints.some(vp => vp.authorId === privyUser?.id);

    useEffect(() => {
        setIsGlobalGraphLoading(false);
    }, [topic.id]);

    const sorted = useMemo(() => {
        const arr = [...viewpoints].sort(sortFunctions[viewpointsSortKey]);
        return sortDirection === 'desc' ? arr : arr.reverse();
    }, [viewpoints, viewpointsSortKey, sortDirection]);

    return (
        <div className="flex-1 flex bg-muted/30 min-h-0 overflow-auto">
            {/* Left negative space (hidden on mobile) */}
            <div className="hidden sm:block flex-[1] max-w-[300px] bg-muted/10 dark:bg-muted/5 border-r border-border/50"></div>

            {/* Center content */}
            <main className="relative w-full flex-[2] flex flex-col min-h-0 bg-background border-r border-border/50 shadow-lg">
                {/* Mobile Header with Topics Toggle */}
                {isMobile && (
                    <div className="flex items-center justify-between p-4 border-b bg-background">
                        <div className="flex items-center gap-2">
                            <Link href={`/s/${space}`}>
                                <button className="flex items-center text-base text-primary hover:underline">
                                    <ArrowLeftIcon className="h-5 w-5 mr-1" /> Back
                                </button>
                            </Link>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsTopicsExpanded(!isTopicsExpanded)}
                            className="flex items-center whitespace-nowrap"
                        >
                            <span>Delegates</span>
                            {isTopicsExpanded ? <ChevronUpIcon className="h-4 w-4 ml-1" /> : <ChevronDownIcon className="h-4 w-4 ml-1" />}
                        </Button>
                    </div>
                )}

                <div className="flex-1 px-4 sm:px-6 lg:px-8 bg-background overflow-y-auto">
                    {/* Desktop Back button */}
                    {!isMobile && (
                        <div className="mb-4 pt-4">
                            <Link href={`/s/${space}`}>
                                <button className="flex items-center text-base text-primary hover:underline">
                                    <ArrowLeftIcon className="h-5 w-5 mr-1" /> Back
                                </button>
                            </Link>
                        </div>
                    )}


                    {/* Topic Header */}
                    <div className="mb-6">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Topic: {topic.name}</h1>
                            {hasCurrentUserRationale && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 rounded-lg text-sm font-medium">
                                    <Check className="w-4 h-4" />
                                    <span>You already published a rationale for this topic</span>
                                </div>
                            )}
                        </div>
                        {topic.discourseUrl && (
                            <a
                                href={topic.discourseUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 rounded-lg text-sm font-medium transition-colors"
                            >
                                <ExternalLink className="w-4 h-4" />
                                <span>View Forum Discussion</span>
                            </a>
                        )}
                    </div>

                    {/* Global Graph Preview */}
                    <div className="mb-6">
                        <div className="border rounded-lg overflow-hidden">
                            <div className="flex items-center justify-between p-4 border-b bg-muted/20">
                                <div>
                                    <h2 className="font-semibold">Global Graph</h2>
                                    <p className="text-sm text-muted-foreground">
                                        {viewpoints.length} rationales connected
                                    </p>
                                </div>
                                <Link href={`/s/${space}/topic/${encodeId(topic.id)}/graph`}>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        disabled={isGlobalGraphLoading}
                                        onClick={() => setIsGlobalGraphLoading(true)}
                                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                                    >
                                        {isGlobalGraphLoading ? (
                                            <>
                                                <Loader className="size-4 text-white" />
                                                Loading...
                                            </>
                                        ) : (
                                            <>
                                                <ExternalLink className="size-4" />
                                                Open Graph
                                            </>
                                        )}
                                    </Button>
                                </Link>
                            </div>
                            <Link href={`/s/${space}/topic/${encodeId(topic.id)}/graph`}>
                                <div
                                    className={`h-32 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/50 dark:to-indigo-950/50 cursor-pointer hover:from-blue-100 hover:to-indigo-200 dark:hover:from-blue-900/50 dark:hover:to-indigo-900/50 transition-colors flex items-center justify-center ${isGlobalGraphLoading ? 'opacity-75' : ''}`}
                                    onClick={() => setIsGlobalGraphLoading(true)}
                                >
                                    <div className="text-center text-muted-foreground">
                                        {isGlobalGraphLoading ? (
                                            <>
                                                <Loader className="size-8 mx-auto mb-2 text-blue-600" />
                                                <p className="text-sm">Loading graph...</p>
                                            </>
                                        ) : (
                                            <>
                                                <LayoutGrid className="size-8 mx-auto mb-2" />
                                                <p className="text-sm">See how rationales in {topic.name} interact with each other</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* Create Rationale Section */}
                    {!hasCurrentUserRationale && (
                        <div className="mb-6">
                            <div className="border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-lg p-6 text-left bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
                                <h2 className="text-lg font-semibold mb-2 text-blue-900 dark:text-blue-100">Create Your Rationale</h2>
                                <p className="text-blue-700 dark:text-blue-200 text-sm mb-4">
                                    Share your perspective on {topic.name}. Build connected arguments with points and evidence.
                                </p>
                                <Link href={`/s/${space}/rationale/new?topicId=${encodeId(topic.id)}`}>
                                    <Button
                                        variant="default"
                                        size="lg"
                                        className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600"
                                    >
                                        Create Rationale for {topic.name}
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Sort Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6 pb-4 border-b border-border">
                        <h2 className="text-lg font-semibold">Rationales ({viewpoints.length})</h2>
                        <div className="flex items-center gap-3">
                            <span className="font-medium text-sm">Sort by:</span>
                            <Select defaultValue="recent" onValueChange={(value) => setSortKey(value as SortKey)}>
                                <SelectTrigger className="w-36">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="recent">Recent</SelectItem>
                                    <SelectItem value="author">Alphabetic</SelectItem>
                                    <SelectItem value="cred">Cred</SelectItem>
                                    <SelectItem value="favor">Favor</SelectItem>
                                    <SelectItem value="views">Views</SelectItem>
                                    <SelectItem value="copies">Copies</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="outline" size="sm" onClick={() => setSortDirection(d => d === 'desc' ? 'asc' : 'desc')}>
                                {sortDirection === 'desc' ? '↓' : '↑'}
                            </Button>
                        </div>
                    </div>

                    {/* Rationales List */}
                    <div className="space-y-3">
                        {sorted.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <p className="text-lg mb-2">No rationales yet</p>
                                <p className="text-sm">Be the first to create a rationale for this topic!</p>
                            </div>
                        ) : (
                            sorted.map((vp) => (
                                <ViewpointCardWrapper
                                    key={vp.id}
                                    id={vp.id}
                                    title={vp.title}
                                    description={vp.description}
                                    authorId={vp.authorId}
                                    author={vp.authorUsername}
                                    createdAt={new Date(vp.createdAt)}
                                    space={space}
                                    statistics={vp.statistics}
                                    topic={topic.name}
                                />
                            ))
                        )}
                    </div>
                </div>
            </main>

            {/* Right sidebar (hidden on mobile) */}
            {!isMobile && (
                <aside className="hidden sm:flex flex-col flex-[1] max-w-[350px] bg-background border-l border-border/50 overflow-y-auto">
                    <div className="p-4 space-y-4">
                        {/* Delta Comparison Widget */}
                        <DeltaComparisonWidget
                            // @ts-ignore
                            comparison={{ type: "topic", topicId: encodeId(topic.id) }}
                            title="Topic Alignment"
                            description="Find aligned users"
                            currentUserId={privyUser?.id}
                        />

                        {/* Delegate Status Section */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Delegate Status</h3>
                                <span className="text-sm text-muted-foreground">By Status</span>
                            </div>
                            <div className="space-y-2">
                                {sortedDelegates.map((user) => (
                                    <div key={user.id} className="flex items-center justify-between p-3 bg-background border rounded-lg hover:bg-accent/50 transition-colors">
                                        <div className="flex flex-col">
                                            <UsernameDisplay
                                                username={user.username}
                                                userId={user.id}
                                                className="text-sm font-medium"
                                            />
                                            <span className="text-xs text-muted-foreground">{Math.round(user.reputation)} cred</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {user.hasPublished ? (
                                                <div className="flex items-center gap-1" title="This delegate already published a rationale for this topic">
                                                    <Check className="w-4 h-4 text-green-600" />
                                                    <span className="text-xs text-green-600">Published</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1" title="This delegate has not published a rationale for this topic yet">
                                                    <div className="w-4 h-4 border-2 border-muted-foreground/30 rounded-full" />
                                                    <span className="text-xs text-muted-foreground">Pending</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {(!sortedDelegates || sortedDelegates.length === 0) && (
                                    <div className="p-4 bg-muted/30 border rounded-lg text-center">
                                        <p className="text-sm text-muted-foreground">
                                            No delegates found in this space
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </aside>
            )}

            {/* Mobile Delegates Overlay */}
            {isMobile && isTopicsExpanded && (
                <div className="fixed inset-0 z-50 bg-background animate-in slide-in-from-bottom duration-300">
                    <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h2 className="text-lg font-semibold">Delegate Status</h2>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsTopicsExpanded(false)}
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Mobile Delta Widget - Above filtering */}
                            <div className="mb-6">
                                <DeltaComparisonWidget
                                    // @ts-ignore
                                    comparison={{ type: "topic", topicId: encodeId(topic.id) }}
                                    title="Topic Alignment"
                                    description="Find aligned users"
                                    currentUserId={privyUser?.id}
                                />
                            </div>

                            {/* Mobile Sort Controls */}
                            <div className="mb-4">
                                <div className="text-sm text-muted-foreground font-medium mb-2">Sorted by Status</div>
                            </div>

                            <div className="space-y-3">
                                {sortedDelegates.map((user) => (
                                    <div key={user.id} className="flex items-center justify-between p-4 bg-muted/20 border rounded-lg hover:bg-muted/30 transition-colors">
                                        <div className="flex flex-col">
                                            <UsernameDisplay
                                                username={user.username}
                                                userId={user.id}
                                                className="font-medium"
                                            />
                                            <span className="text-sm text-muted-foreground">{Math.round(user.reputation)} cred</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {user.hasPublished ? (
                                                <div className="flex items-center gap-2" title="This delegate already published a rationale for this topic">
                                                    <Check className="w-5 h-5 text-green-600" />
                                                    <span className="text-sm text-green-600">Published</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2" title="This delegate has not published a rationale for this topic yet">
                                                    <div className="w-5 h-5 border-2 border-muted-foreground/30 rounded-full" />
                                                    <span className="text-sm text-muted-foreground">Pending</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {(!sortedDelegates || sortedDelegates.length === 0) && (
                                    <div className="p-6 bg-muted/30 border rounded-lg text-center">
                                        <p className="text-muted-foreground">
                                            No delegates found in this space
                                        </p>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 