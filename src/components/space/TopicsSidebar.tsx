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
import { Plus, ChevronRight } from "lucide-react";
import Link from "next/link";
import { encodeId } from "@/lib/negation-game/encodeId";
import { usePathname, useRouter } from "next/navigation";

interface TopicsSidebarProps {
    space: string;
    topicFilters: string[];
    onTopicFiltersChange: (filters: string[]) => void;
    isOpen: boolean;
    onClose?: () => void;
}

export const TopicsSidebar = memo(({
    space,
    topicFilters,
    onTopicFiltersChange,
    isOpen,
    onClose,
}: TopicsSidebarProps) => {
    const pathname = usePathname();
    const router = useRouter();
    const isHomePage = pathname === `/s/${space}`;

    const { data: topics, refetch: refetchTopics, isLoading } = useTopics(space);
    const [newTopicDialogOpen, setNewTopicDialogOpen] = useState(false);
    const [newTopicName, setNewTopicName] = useState("");
    const [discourseUrl, setDiscourseUrl] = useState("");
    const [isSubmittingTopic, setIsSubmittingTopic] = useState(false);
    const [urlError, setUrlError] = useState<string | null>(null);
    const newTopicInputRef = useRef<HTMLInputElement>(null);

    const availableTopics = useMemo(() => {
        return topics ? topics.map((t: any) => t.name).filter((n: string) => n.trim()).sort() : [];
    }, [topics]);

    useEffect(() => {
        if (newTopicDialogOpen) {
            setTimeout(() => newTopicInputRef.current?.focus(), 50);
        } else {
            setNewTopicName("");
            setDiscourseUrl("");
            setUrlError(null);
        }
    }, [newTopicDialogOpen]);

    useEffect(() => {
        if (!topics || topics.length === 0) return;
        try {
            const toPrefetch = topics.slice(0, 100);
            for (const t of toPrefetch) {
                if (!t?.id) continue;
                const href = `/s/${space}/topic/${encodeId(t.id)}`;
                try { router.prefetch(href); } catch { }
            }
            try { router.prefetch(`/s/${space}/topics`); } catch { }
        } catch { }
    }, [topics, router, space]);

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

    if (isLoading) {
        return (
            <div className="w-full h-full px-2 flex flex-col">
                {/* Header skeleton */}
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/50 p-3">
                    <div className="flex items-center justify-between">
                        <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                    </div>
                </div>

                {/* Topics list skeleton */}
                <div className="p-3 space-y-2">
                    <div className="space-y-0.5">
                        {[...Array(6)].map((_, index) => (
                            <div
                                key={index}
                                className="w-full h-9 bg-muted rounded animate-pulse"
                                style={{ animationDelay: `${index * 50}ms` }}
                            />
                        ))}

                        {/* New Topic button skeleton */}
                        <div className="w-full h-8 bg-muted rounded animate-pulse border border-border"
                            style={{ animationDelay: '300ms' }} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div
                className={cn(
                    "w-full h-full flex flex-col overflow-hidden",
                    "lg:relative",
                    !onClose && "lg:translate-x-0"
                )}
            >
                <div className="sticky top-0 z-10 backdrop-blur border-b border-border/50 p-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-muted-foreground">Topics</h2>
                        <button
                            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                            onClick={(e) => {
                                e.preventDefault();
                                router.push(`/s/${space}/topics`);
                            }}
                        >
                            View All
                        </button>
                    </div>
                </div>

                <div className="pl-2 -ml-2 space-y-2 overflow-hidden">
                    <div className="space-y-0.5 w-full max-w-full">
                        <TooltipProvider>
                            {availableTopics.map((topicName: string) => {
                                const topic = topics?.find(t => t.name === topicName);
                                const validUrl = topic?.discourseUrl ? validateAndFormatUrl(topic.discourseUrl) : null;
                                const isSelected = topicFilters.includes(topicName);
                                const hasNoPoints = topic?.pointsCount === 0;

                                return (
                                    <div key={topicName} className="flex items-center gap-1 w-full min-w-0">
                                        <Tooltip>
                                            <TooltipTrigger asChild className="flex-1 min-w-0">
                                                <Button
                                                    variant={isSelected ? "secondary" : isHomePage ? "ghost" : "outline"}
                                                    size="sm"
                                                    className={cn(
                                                        "w-full justify-start text-left h-auto min-h-[36px] text-xs py-2 px-3 min-w-0",
                                                        isSelected && "bg-secondary",
                                                        hasNoPoints && "opacity-50",
                                                        !isHomePage && "hover:bg-transparent border-0"
                                                    )}
                                                    onClick={(e) => {
                                                        if (validUrl && (e.metaKey || e.ctrlKey)) {
                                                            window.open(validUrl, '_blank');
                                                            return;
                                                        }
                                                        if (isSelected) {
                                                            onTopicFiltersChange([]);
                                                        } else {
                                                            onTopicFiltersChange([topicName]);
                                                        }
                                                    }}
                                                >
                                                    <span className="break-words leading-tight overflow-hidden">
                                                        {topicName}
                                                    </span>
                                                </Button>
                                            </TooltipTrigger>
                                            {validUrl && (
                                                <TooltipContent side="right">
                                                    Related: <a href={validUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" onClick={(e) => { e.preventDefault(); window.open(validUrl, '_blank'); }}>{validUrl}</a>
                                                </TooltipContent>
                                            )}
                                        </Tooltip>

                                        {topic && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-9 w-9 p-0 opacity-50 hover:opacity-100"
                                                title={`View ${topicName} topic page`}
                                                onClick={(e) => {
                                                    const href = `/s/${space}/topic/${encodeId(topic.id)}`;
                                                    if (pathname === href) {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        return;
                                                    }
                                                    router.push(href);
                                                }}
                                            >
                                                <ChevronRight className="h-3 w-3" />
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </TooltipProvider>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setNewTopicDialogOpen(true)}
                            className="flex-1 justify-start gap-1.5 h-8 text-xs w-full"
                        >
                            <Plus className="h-3 w-3" />
                            New Topic
                        </Button>
                    </div>

                    {topicFilters.length > 0 && (
                        <div className="pt-2 mt-2 border-t">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                    {topicFilters.length} selected
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onTopicFiltersChange([])}
                                    className="h-6 px-2 text-xs"
                                >
                                    Clear
                                </Button>
                            </div>
                        </div>
                    )}
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
        </>
    );
});

TopicsSidebar.displayName = 'TopicsSidebar';