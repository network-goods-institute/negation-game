"use client";
import React, { useState, useMemo } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ViewpointCardWrapper } from "@/components/cards/ViewpointCardWrapper";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTopics } from "@/queries/topics/useTopics";
import Link from "next/link";
import { encodeId } from "@/lib/negation-game/encodeId";
import { Loader } from "@/components/ui/loader";

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
    const [sortKey, setSortKey] = useState<SortKey>("recent");
    const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>("desc");
    const sorted = useMemo(() => {
        const arr = [...viewpoints].sort(sortFunctions[sortKey]);
        return sortDirection === 'desc' ? arr : arr.reverse();
    }, [viewpoints, sortKey, sortDirection]);

    const { data: allTopics, isLoading: topicsLoading } = useTopics(space);

    return (
        <div className="flex-1 grid sm:grid-cols-[minmax(0,600px)_1fr] bg-background min-h-0">
            <div className="relative w-full flex flex-col min-h-0 px-4 py-4 overflow-y-auto">
                {/* Back button */}
                <div className="mb-4">
                    <button onClick={() => router.back()} className="flex items-center text-base text-primary hover:underline">
                        <ArrowLeftIcon className="h-5 w-5 mr-1" /> Back
                    </button>
                </div>
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
                {/* Global Graph View moved here */}
                <div className="border-2 border-dashed border-muted p-6 rounded-lg mb-6 text-center">
                    <span className="text-lg font-semibold">Global Graph View</span>
                    <div className="mt-4">
                        <Button variant="outline" size="lg">Coming Soon</Button>
                    </div>
                </div>
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
            <aside className="hidden sm:flex flex-col p-6 gap-4 border-l overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Other Topics</h2>
                {topicsLoading ? (
                    <div className="flex items-center justify-center py-4"><Loader className="size-8" /></div>
                ) : (
                    <div className="grid grid-cols-3 gap-4 justify-items-center">
                        {allTopics?.filter(t => t.id !== topic.id).map(t => (
                            <Link
                                key={t.id}
                                href={`/s/${space}/topic/${encodeId(t.id)}`}
                                className="w-32 h-32 bg-muted rounded flex flex-col items-center justify-center p-2 text-lg font-bold text-center shadow-md border border-transparent hover:border-primary transition-all duration-200 ease-in-out hover:scale-105 group relative overflow-hidden"
                            >
                                {t.name}
                                {t.discourseUrl && (
                                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 text-white text-xs break-words text-left">
                                        <span className="truncate">{t.discourseUrl.replace(/^(https?:\/\/)?(www\.)?/i, '')}</span>
                                    </div>
                                )}
                            </Link>
                        ))}
                    </div>
                )}
            </aside>
        </div>
    );
} 