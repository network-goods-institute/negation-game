"use client";

import React, { memo, useState, useEffect, useRef, useMemo, useCallback } from "react";
import useIsMobile from "@/hooks/ui/useIsMobile";
import { useAtom } from "jotai";
import { rationalesFiltersOpenAtom } from "@/atoms/rationalesFiltersOpenAtom";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { DEFAULT_SPACE } from "@/constants/config";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";
import { ViewpointIcon } from "@/components/icons/AppIcons";
import { validateAndFormatUrl } from "@/lib/validation/validateUrl";
import { createTopic } from "@/actions/topics/createTopic";
import { useTopics } from "@/queries/topics/useTopics";
import { PointFilterSelector } from "@/components/inputs/PointFilterSelector";
import { ViewpointCardWrapper } from "@/components/cards/ViewpointCardWrapper";

const MemoizedViewpointCardWrapper = memo(ViewpointCardWrapper);

export interface RationalesTabContentProps {
    viewpoints: any[] | undefined;
    viewpointsLoading: boolean;
    space: string;
    handleNewViewpoint: () => void;
    handleCardClick: (id: string) => void;
    loadingCardId: string | null;
    points: any[] | undefined;
}

export const RationalesTabContent = memo(({
    viewpoints,
    viewpointsLoading,
    space,
    handleNewViewpoint,
    handleCardClick,
    loadingCardId,
    points
}: RationalesTabContentProps) => {
    const [selectedPointIds, setSelectedPointIds] = useState<number[]>([]);
    const [matchType, setMatchType] = useState<"any" | "all">("any");
    const [topicFilters, setTopicFilters] = useState<string[]>([]);
    const isMobile = useIsMobile();
    const [filtersOpen] = useAtom(rationalesFiltersOpenAtom);
    const { data: topics, refetch: refetchTopics } = useTopics(space ?? DEFAULT_SPACE);
    const [newTopicDialogOpen, setNewTopicDialogOpen] = useState(false);
    const [newTopicName, setNewTopicName] = useState("");
    const [discourseUrl, setDiscourseUrl] = useState("");
    const [isSubmittingTopic, setIsSubmittingTopic] = useState(false);
    const [urlError, setUrlError] = useState<string | null>(null);
    const newTopicInputRef = useRef<HTMLInputElement>(null);

    const availableTopics = useMemo(() => {
        return topics ? topics.map((t: any) => t.name).filter((n: string) => n.trim()).sort() : [];
    }, [topics]);

    const [isTopicsExpanded, setIsTopicsExpanded] = useState(false);
    const COLLAPSED_TOPIC_LIMIT = 5;

    const topicsToDisplay = useMemo(() => {
        if (isTopicsExpanded) {
            return availableTopics;
        } else {
            return availableTopics.slice(0, COLLAPSED_TOPIC_LIMIT);
        }
    }, [availableTopics, isTopicsExpanded]);

    useEffect(() => {
        if (newTopicDialogOpen) {
            setTimeout(() => newTopicInputRef.current?.focus(), 50);
        } else {
            setNewTopicName("");
            setDiscourseUrl("");
            setUrlError(null);
        }
    }, [newTopicDialogOpen]);

    const handleDialogAddTopic = async () => {
        if (!newTopicName.trim()) return;

        let formattedUrl = "";
        if (discourseUrl.trim()) {
            const validUrl = validateAndFormatUrl(discourseUrl.trim());
            if (!validUrl) {
                setUrlError("Please enter a valid URL");
                return;
            }
            formattedUrl = validUrl;
        }

        setIsSubmittingTopic(true);
        try {
            await createTopic(newTopicName.trim(), space ?? DEFAULT_SPACE, formattedUrl);
            refetchTopics();
            setTopicFilters((prev) => [...prev, newTopicName.trim()]);
            setNewTopicDialogOpen(false);
        } finally {
            setIsSubmittingTopic(false);
        }
    };

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDiscourseUrl(e.target.value);
        setUrlError(null);
    };

    const filteredViewpoints = useMemo<any[]>(() => {
        const vps = viewpoints || [];
        if (!selectedPointIds.length) return vps;
        return vps.filter((viewpoint: any) => {
            if (!viewpoint.graph?.nodes) return false;
            const pointNodes = viewpoint.graph.nodes
                .filter((node: any) => node.type === 'point')
                .map((node: any) => Number(node.data?.pointId));

            if (matchType === "all") {
                return selectedPointIds.every(id => pointNodes.includes(id));
            } else {
                return selectedPointIds.some(id => pointNodes.includes(id));
            }
        });
    }, [viewpoints, selectedPointIds, matchType]);

    const finalFilteredViewpoints = useMemo<any[]>(() => {
        if (topicFilters.length === 0) return filteredViewpoints;
        return filteredViewpoints.filter((vp: any) => {
            if (!vp.topic) return false;
            const vt = vp.topic.toLowerCase();
            return topicFilters.some((f: string) => vt.includes(f.toLowerCase()));
        });
    }, [filteredViewpoints, topicFilters]);

    const [visibleCount, setVisibleCount] = useState(20);
    const visibleViewpoints = useMemo(() => finalFilteredViewpoints.slice(0, visibleCount), [finalFilteredViewpoints, visibleCount]);
    useEffect(() => {
        setVisibleCount(20);
    }, [finalFilteredViewpoints]);

    const handlePointSelect = useCallback((pointId: number) => {
        setSelectedPointIds(prev => [...prev, pointId]);
    }, []);

    const handlePointDeselect = useCallback((pointId: number) => {
        setSelectedPointIds(prev => prev.filter(id => id !== pointId));
    }, []);

    const handleClearAll = useCallback(() => {
        setSelectedPointIds([]);
    }, []);

    const handleMatchTypeChange = useCallback((type: "any" | "all") => {
        setMatchType(type);
    }, []);

    if (viewpoints === undefined || viewpointsLoading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-200px)]">
                <Loader className="h-6 w-6" />
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            <div className="sticky top-0 z-10 bg-background">
                {(!isMobile || filtersOpen) && (
                    <>
                        {availableTopics.length > 0 && (
                            <div className="px-4 pt-3 pb-2 border-b">
                                <div className="flex flex-wrap items-center gap-2 pb-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setNewTopicDialogOpen(true)}
                                        className="rounded-full text-xs h-7 px-3 flex-shrink-0"
                                    >
                                        + New Topic
                                    </Button>
                                    <Button
                                        variant={topicFilters.length === 0 ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => { if (topicFilters.length > 0) setTopicFilters([]); }}
                                        className="rounded-full text-xs h-7 px-3 flex-shrink-0"
                                    >
                                        All Topics
                                    </Button>
                                    <TooltipProvider>
                                        {topicsToDisplay.map((topicName: string) => {
                                            const topic = topics?.find(t => t.name === topicName);
                                            const validUrl = topic?.discourseUrl ? validateAndFormatUrl(topic.discourseUrl) : null;
                                            return (
                                                <Tooltip key={topicName}>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant={topicFilters.includes(topicName) ? "default" : "outline"}
                                                            size="sm"
                                                            className={cn(
                                                                "rounded-full text-xs h-7 px-3 flex-shrink-0",
                                                                validUrl && "underline decoration-dotted"
                                                            )}
                                                            onClick={(e) => {
                                                                if (validUrl && (e.metaKey || e.ctrlKey)) {
                                                                    window.open(validUrl, '_blank');
                                                                    return;
                                                                }
                                                                if (topicFilters.includes(topicName)) {
                                                                    setTopicFilters(prev => prev.filter(t => t !== topicName));
                                                                } else {
                                                                    setTopicFilters(prev => [...prev, topicName]);
                                                                }
                                                            }}
                                                        >
                                                            {topicName}
                                                        </Button>
                                                    </TooltipTrigger>
                                                    {validUrl && (
                                                        <TooltipContent side="bottom">
                                                            Related: <a href={validUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" onClick={(e) => { e.preventDefault(); window.open(validUrl, '_blank'); }}>{validUrl}</a>
                                                        </TooltipContent>
                                                    )}
                                                </Tooltip>
                                            );
                                        })}
                                    </TooltipProvider>
                                    {availableTopics.length > COLLAPSED_TOPIC_LIMIT && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                if (isTopicsExpanded) {
                                                    const visibleTopicNamesAfterCollapse = availableTopics.slice(0, COLLAPSED_TOPIC_LIMIT);
                                                    setTopicFilters(prev => prev.filter(f => visibleTopicNamesAfterCollapse.includes(f)));
                                                }
                                                setIsTopicsExpanded(!isTopicsExpanded);
                                            }}
                                            className="rounded-full text-xs h-7 px-3 flex-shrink-0"
                                        >
                                            {isTopicsExpanded ? "Show fewer topics" : "Show all topics"}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="px-4 py-2 border-b">
                            <PointFilterSelector
                                points={points || []}
                                selectedPointIds={selectedPointIds}
                                onPointSelect={handlePointSelect}
                                onPointDeselect={handlePointDeselect}
                                onClearAll={handleClearAll}
                                matchType={matchType}
                                onMatchTypeChange={handleMatchTypeChange}
                            />
                        </div>
                    </>
                )}
            </div>
            <Dialog open={newTopicDialogOpen} onOpenChange={setNewTopicDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Topic</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Topic Name</Label>
                            <Input
                                ref={newTopicInputRef}
                                value={newTopicName}
                                onChange={e => setNewTopicName(e.target.value)}
                                placeholder="Enter topic name"
                                onKeyDown={e => {
                                    if (e.key === "Enter" && newTopicName.trim()) handleDialogAddTopic();
                                }}
                                disabled={isSubmittingTopic}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Discourse URL (optional)</Label>
                            <Input
                                value={discourseUrl}
                                onChange={handleUrlChange}
                                placeholder="Enter discourse URL"
                                disabled={isSubmittingTopic}
                            />
                            {urlError && <p className="text-sm text-destructive mt-1">{urlError}</p>}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setNewTopicDialogOpen(false)} disabled={isSubmittingTopic}>Cancel</Button>
                        <Button onClick={handleDialogAddTopic} disabled={!newTopicName.trim() || isSubmittingTopic}>Add Topic</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {finalFilteredViewpoints.length === 0 ? (
                <div className="flex flex-col flex-grow items-center justify-center gap-4 py-12 text-center min-h-[50vh]">
                    <span className="text-muted-foreground">
                        {selectedPointIds.length > 0
                            ? `No rationales found containing ${matchType === "all" ? "all" : "any of"} the selected points`
                            : "Nothing here yet"}
                    </span>
                    <Button variant="outline" onClick={handleNewViewpoint}>
                        <ViewpointIcon className="mr-2.5 size-4" />
                        Create a Rationale
                    </Button>
                </div>
            ) : (
                <>
                    {visibleViewpoints.map((viewpoint: any) => (
                        <MemoizedViewpointCardWrapper
                            key={`rationales-tab-${viewpoint.id}`}
                            id={viewpoint.id}
                            authorId={viewpoint.authorId}
                            title={viewpoint.title}
                            description={viewpoint.description}
                            author={viewpoint.authorUsername}
                            createdAt={new Date(viewpoint.createdAt)}
                            space={space || "global"}
                            statistics={{
                                views: viewpoint.statistics?.views || 0,
                                copies: viewpoint.statistics?.copies || 0,
                                totalCred: viewpoint.statistics?.totalCred || 0,
                                averageFavor: viewpoint.statistics?.averageFavor || 0
                            }}
                            loadingCardId={loadingCardId}
                            handleCardClick={handleCardClick}
                            topic={viewpoint.topic}
                        />
                    ))}
                    {visibleCount < finalFilteredViewpoints.length && (
                        <div className="flex justify-center my-4">
                            <Button variant="outline" onClick={() => setVisibleCount(c => c + 20)}>
                                Load more
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
});

RationalesTabContent.displayName = 'RationalesTabContent'; 