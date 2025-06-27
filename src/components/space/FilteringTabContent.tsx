"use client";

import React, { memo, useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";
import { validateAndFormatUrl } from "@/lib/validation/validateUrl";
import { createTopic } from "@/actions/topics/createTopic";
import { useTopics } from "@/queries/topics/useTopics";
import { PointFilterSelector } from "@/components/inputs/PointFilterSelector";

export interface FilteringTabContentProps {
    space: string;
    points: any[] | undefined;
    selectedPointIds: number[];
    onPointSelect: (pointId: number) => void;
    onPointDeselect: (pointId: number) => void;
    onClearAll: () => void;
    matchType: "any" | "all";
    onMatchTypeChange: (type: "any" | "all") => void;
    topicFilters: string[];
    onTopicFiltersChange: (filters: string[]) => void;
}

export const FilteringTabContent = memo(({
    space,
    points,
    selectedPointIds,
    onPointSelect,
    onPointDeselect,
    onClearAll,
    matchType,
    onMatchTypeChange,
    topicFilters,
    onTopicFiltersChange,
}: FilteringTabContentProps) => {
    if (!space) {
        throw new Error("Space is required to load topics");
    }

    const { data: topics, refetch: refetchTopics } = useTopics(space);
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
            await createTopic(newTopicName.trim(), space, formattedUrl);
            refetchTopics();
            onTopicFiltersChange([...topicFilters, newTopicName.trim()]);
            setNewTopicDialogOpen(false);
        } finally {
            setIsSubmittingTopic(false);
        }
    };

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDiscourseUrl(e.target.value);
        setUrlError(null);
    };

    return (
        <div className="flex flex-col p-4 space-y-6">
            <div className="space-y-4">
                <h2 className="text-lg font-semibold">Filter Rationales</h2>

                {/* Topic Filters */}
                {availableTopics.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-md font-medium">Filter by Topics</h3>
                        <div className="flex flex-wrap items-center gap-2">
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
                                onClick={() => { if (topicFilters.length > 0) onTopicFiltersChange([]); }}
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
                                                            onTopicFiltersChange(topicFilters.filter(t => t !== topicName));
                                                        } else {
                                                            onTopicFiltersChange([...topicFilters, topicName]);
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
                                            onTopicFiltersChange(topicFilters.filter(f => visibleTopicNamesAfterCollapse.includes(f)));
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

                {/* Point Filters */}
                <div className="space-y-3">
                    <h3 className="text-md font-medium">Filter by Points</h3>
                    <PointFilterSelector
                        points={points || []}
                        selectedPointIds={selectedPointIds}
                        onPointSelect={onPointSelect}
                        onPointDeselect={onPointDeselect}
                        onClearAll={onClearAll}
                        matchType={matchType}
                        onMatchTypeChange={onMatchTypeChange}
                    />
                </div>
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
        </div>
    );
});

FilteringTabContent.displayName = 'FilteringTabContent'; 