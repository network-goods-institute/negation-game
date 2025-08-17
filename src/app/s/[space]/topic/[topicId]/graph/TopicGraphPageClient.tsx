"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, LayoutGrid, List, X } from "lucide-react";
import Link from "next/link";
import { encodeId } from "@/lib/negation-game/encodeId";
import GlobalTopicGraph from "@/components/topic/GlobalTopicGraph";
import { Dynamic } from "@/components/utils/Dynamic";
import { useTopicPoints } from "@/queries/topics/useTopicPoints";
import EnhancedRationalePointsList from "@/components/rationale/EnhancedRationalePointsList";
import { Loader } from "@/components/ui/loader";
import { useAtom } from "jotai";
import { hoveredPointIdAtom } from "@/atoms/hoveredPointIdAtom";
import useIsMobile from "@/hooks/ui/useIsMobile";
import { cn } from "@/lib/utils/cn";
import { ReactFlowProvider } from "@xyflow/react";

interface Topic {
    id: number;
    name: string;
    discourseUrl?: string | null;
}

interface TopicGraphPageClientProps {
    topic: Topic;
    space: string;
}

function TopicGraphPageClientContent({ topic, space }: TopicGraphPageClientProps) {
    const { data: topicPoints, isLoading: pointsLoading } = useTopicPoints(topic.id);
    const [hoveredPointId] = useAtom(hoveredPointIdAtom);
    const points = useMemo(() => {
        if (!topicPoints) return [];
        return topicPoints.map(point => ({
            pointId: point.pointId,
            initialPointData: point,
        }));
    }, [topicPoints]);

    const [view, setView] = useState<'graph' | 'list'>('list');
    const isMobile = useIsMobile();

    return (
        <div className="flex-1 bg-background h-[calc(100vh-var(--header-height))] overflow-hidden md:grid md:grid-cols-[0_minmax(200px,400px)_1fr]">
            {/* Hidden spacer column */}
            <div className="hidden md:block"></div>

            {/* Left sidebar - Points List */}
            <div className={cn(
                "flex flex-col h-full md:col-start-2 border-x overflow-hidden",
                isMobile && view === 'graph' && "hidden"
            )}>
                {/* Header */}
                <div className="sticky top-0 z-20 w-full flex items-center justify-between px-4 py-3 bg-background border-b">
                    <div className="flex items-center gap-4">
                        <Link href={`/s/${space}/topic/${encodeId(topic.id)}`}>
                            <Button variant="outline" size="sm" className="flex items-center gap-2">
                                <ArrowLeftIcon className="h-4 w-4" />
                                Back
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-sm font-semibold">Global Graph: {topic.name}</h1>
                            {topic.discourseUrl && (
                                <a
                                    href={topic.discourseUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-muted-foreground hover:text-primary"
                                >
                                    Related discussion
                                </a>
                            )}
                        </div>
                    </div>

                    {/* View Toggle - Mobile */}
                    {isMobile && view === 'list' && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setView('graph')}
                            className="flex items-center gap-2"
                        >
                            <LayoutGrid className="h-4 w-4" />
                            View Graph
                        </Button>
                    )}
                </div>

                {/* Points List */}
                <div className="flex-1 min-h-0 overflow-y-auto">
                    {pointsLoading ? (
                        <div className="flex items-center justify-center h-32">
                            <Loader className="h-6 w-6" />
                        </div>
                    ) : points.length > 0 ? (
                        <EnhancedRationalePointsList
                            points={points}
                            hoveredPointId={hoveredPointId}
                            editMode={false}
                            isSharing={false}
                            containerClassName="relative flex flex-col"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-32 text-muted-foreground">
                            <p className="text-sm">No points found for this topic</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right side - Graph */}
            <div className={cn(
                "flex flex-col h-full md:col-start-3 min-h-0",
                isMobile && view === 'list' && "hidden"
            )}>
                {/* Mobile Graph Header with Close Button */}
                {isMobile && view === 'graph' && (
                    <div className="sticky top-0 z-20 w-full flex items-center justify-between px-4 py-3 bg-background border-b">
                        <h1 className="text-sm font-semibold">Graph View: {topic.name}</h1>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setView('list')}
                            className="flex items-center gap-2"
                        >
                            <X className="h-4 w-4" />
                            Close
                        </Button>
                    </div>
                )}

                <div className="flex-1 min-h-0 relative">
                    {pointsLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader className="h-8 w-8" />
                        </div>
                    ) : (
                        <Dynamic>
                            <GlobalTopicGraph
                                topicId={topic.id}
                                topicName={topic.name}
                                className="h-full"
                            />
                        </Dynamic>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function TopicGraphPageClient(props: TopicGraphPageClientProps) {
    return (
        <ReactFlowProvider>
            <TopicGraphPageClientContent {...props} />
        </ReactFlowProvider>
    );
} 