"use client";

import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import Link from "next/link";
import { encodeId } from "@/lib/negation-game/encodeId";
import { useTopics } from "@/queries/topics/useTopics";

interface SpacePageAsideProps {
    spaceId: string;
    asideTab: "topics" | "create";
    setAsideTab: (tab: "topics" | "create") => void;
    loginOrMakePoint: () => void;
    handleNewViewpoint: () => void;
    setIsSelectNegationOpen: (open: boolean) => void;
}

export function SpacePageAside({
    spaceId,
    asideTab,
    setAsideTab,
    loginOrMakePoint,
    handleNewViewpoint,
    setIsSelectNegationOpen,
}: SpacePageAsideProps) {
    const { data: topics, isLoading: topicsLoading } = useTopics(spaceId);
    return (
        <aside className="hidden sm:flex flex-col items-center p-6 gap-4 border-l overflow-y-auto">
            <Tabs value={asideTab} onValueChange={(v) => setAsideTab(v as "topics" | "create")} className="w-full flex flex-col">
                <TabsList className="w-full">
                    <TabsTrigger value="topics" className="w-1/2 text-center">Topics</TabsTrigger>
                    <TabsTrigger value="create" className="w-1/2 text-center">Create</TabsTrigger>
                </TabsList>
                <TabsContent value="topics" className="mt-20 space-y-16">
                    <Button onClick={handleNewViewpoint} variant="outline" className="w-full h-24 text-3xl" size="lg">
                        New Rationale
                    </Button>
                    {topicsLoading ? (
                        <div className="flex items-center justify-center py-4"><Loader className="size-8" /></div>
                    ) : (
                        <div className="grid grid-cols-3 gap-8 justify-items-center p-2">
                            {topics?.map((topic) => (
                                <Link
                                    key={topic.id}
                                    href={`/s/${spaceId}/topic/${encodeId(topic.id)}`}
                                    className="w-48 h-48 bg-muted rounded flex items-center justify-center p-2 text-xl font-bold text-center shadow-md border border-transparent hover:border-primary transition-all duration-200 ease-in-out hover:scale-105 group relative overflow-hidden"
                                >
                                    {topic.name}
                                    {topic.discourseUrl && (
                                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 text-white text-xs break-words text-left">
                                            <span className="truncate">{topic.discourseUrl.replace(/^(https?:\/\/)?(www\.)?/i, '')}</span>
                                        </div>
                                    )}
                                </Link>
                            ))}
                        </div>
                    )}
                </TabsContent>
                <TabsContent value="create" className="mt-20 space-y-16">
                    <div className="flex gap-8 justify-center">
                        <Button onClick={loginOrMakePoint} variant="outline" className="w-72 h-72" size="default">
                            Make a Point
                        </Button>
                        <Button onClick={handleNewViewpoint} variant="outline" className="w-72 h-72" size="default">
                            New Rationale
                        </Button>
                    </div>
                    <Button onClick={() => setIsSelectNegationOpen(true)} variant="outline" className="mx-auto w-72 h-72" size="default">
                        Make a Negation
                    </Button>
                </TabsContent>
            </Tabs>
        </aside>
    );
} 