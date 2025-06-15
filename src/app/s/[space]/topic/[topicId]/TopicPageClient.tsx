"use client";
import React, { useState, useMemo } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ViewpointCardWrapper } from "@/components/cards/ViewpointCardWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeftIcon, Search, ChevronDownIcon, ChevronUpIcon, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTopics } from "@/queries/topics/useTopics";
import Link from "next/link";
import { encodeId } from "@/lib/negation-game/encodeId";
import { Loader } from "@/components/ui/loader";
import { TopicCard } from "@/components/topic/TopicCard";
import useIsMobile from "@/hooks/ui/useIsMobile";


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
    const [viewpointsSortKey, setSortKey] = useState<SortKey>("recent");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
    const [isTopicsExpanded, setIsTopicsExpanded] = useState(false);
    const [topicSearch, setTopicSearch] = useState("");
    const [loadingTopicId, setLoadingTopicId] = useState<number | null>(null);

    const { data: topicsData, isLoading: topicsLoading } = useTopics(space);

    const filteredTopics = useMemo(() => {
        if (!topicsData) return [];
        const otherTopics = topicsData.filter(t => t.id !== topic.id);
        if (!topicSearch.trim()) return otherTopics;
        return otherTopics.filter(t =>
            t.name.toLowerCase().includes(topicSearch.toLowerCase())
        );
    }, [topicsData, topicSearch, topic.id]);

    const handleTopicClick = (topicId: number) => {
        setLoadingTopicId(topicId);
        setTimeout(() => setLoadingTopicId(null), 1000);
    };

    const sorted = useMemo(() => {
        const arr = [...viewpoints].sort(sortFunctions[viewpointsSortKey]);
        return sortDirection === 'desc' ? arr : arr.reverse();
    }, [viewpoints, viewpointsSortKey, sortDirection]);

    return (
        <div className="flex-1 flex flex-col bg-background min-h-0">
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
                        <span>Topics</span>
                        {isTopicsExpanded ? <ChevronUpIcon className="h-4 w-4 ml-1" /> : <ChevronDownIcon className="h-4 w-4 ml-1" />}
                    </Button>
                </div>
            )}

            <div className="flex-1 grid sm:grid-cols-[minmax(0,1fr)_700px] bg-background min-h-0 overflow-hidden">
                {/* Main Content */}
                <div className="relative w-full flex flex-col min-h-0 px-4 py-4 overflow-y-auto">
                    {/* Desktop Back button */}
                    {!isMobile && (
                        <div className="mb-4">
                            <Link href={`/s/${space}`}>
                                <button className="flex items-center text-base text-primary hover:underline">
                                    <ArrowLeftIcon className="h-5 w-5 mr-1" /> Back
                                </button>
                            </Link>
                        </div>
                    )}

                    <h1 className="text-2xl font-bold mb-4">Topic: {topic.name}</h1>
                    {topic.discourseUrl && (
                        <a
                            href={topic.discourseUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline text-sm mb-4 block"
                        >
                            {topic.discourseUrl.replace(/^(https?:\/\/)?(www\.)?/i, '')}
                        </a>
                    )}

                    <div className="flex items-center mb-6 gap-4">
                        <span className="font-medium">Sort by:</span>
                        <Select defaultValue="recent" onValueChange={(value) => setSortKey(value as SortKey)}>
                            <SelectTrigger className="w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="recent">Recent</SelectItem>
                                <SelectItem value="author">Author</SelectItem>
                                <SelectItem value="cred">Cred</SelectItem>
                                <SelectItem value="favor">Favor</SelectItem>
                                <SelectItem value="views">Views</SelectItem>
                                <SelectItem value="copies">Copies</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" className="ml-2" onClick={() => setSortDirection(d => d === 'desc' ? 'asc' : 'desc')}>
                            {sortDirection === 'desc' ? 'Desc' : 'Asc'}
                        </Button>
                    </div>

                    {/* Global Graph View */}
                    <div className="mb-6">
                        <div className="border rounded-lg p-6 text-center">
                            <h2 className="text-lg font-semibold mb-2">Global Graph View</h2>
                            <p className="text-muted-foreground text-sm mb-4">
                                View all {viewpoints.length} rationales from this topic in an interactive graph
                            </p>
                            <Link href={`/s/${space}/topic/${encodeId(topic.id)}/graph`}>
                                <Button variant="default" size="lg" className="w-full sm:w-auto">
                                    Open Global Graph
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Viewpoints List */}
                    <div className="flex flex-col space-y-4">
                        {sorted.map((vp) => (
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
                        ))}
                    </div>
                </div>

                {/* Desktop Sidebar */}
                {!isMobile && (
                    <aside className="hidden sm:flex flex-col p-4 gap-4 border-l overflow-y-auto bg-muted/20">
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold">Other Topics</h2>

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
                                <div className="flex items-center justify-center py-8">
                                    <Loader className="size-6" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {filteredTopics.length > 0 ? (
                                        filteredTopics.map(t => (
                                            <div key={t.id} onClick={() => handleTopicClick(t.id)}>
                                                <TopicCard
                                                    topic={t}
                                                    spaceId={space}
                                                    size="sm"
                                                    loading={loadingTopicId === t.id}
                                                />
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-2 text-center py-4 text-muted-foreground">
                                            <p className="text-sm">
                                                {topicSearch.trim() ? 'No topics found' : 'No other topics'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </aside>
                )}
            </div>

            {/* Mobile Topics Overlay */}
            {isMobile && isTopicsExpanded && (
                <div className="fixed inset-0 z-50 bg-background animate-in slide-in-from-bottom duration-300">
                    <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h2 className="text-lg font-semibold">Other Topics</h2>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsTopicsExpanded(false)}
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="relative mb-6">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search topics..."
                                    value={topicSearch}
                                    onChange={(e) => setTopicSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            {topicsLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader className="size-8" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {filteredTopics.length > 0 ? (
                                        filteredTopics.map(t => (
                                            <div key={t.id} onClick={() => handleTopicClick(t.id)}>
                                                <TopicCard
                                                    topic={t}
                                                    spaceId={space}
                                                    size="md"
                                                    loading={loadingTopicId === t.id}
                                                />
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-2 text-center py-8 text-muted-foreground">
                                            <p className="text-sm">
                                                {topicSearch.trim() ? 'No topics found' : 'No other topics'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 