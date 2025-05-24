"use client";

import { negatedPointIdAtom } from "@/atoms/negatedPointIdAtom";
import { PointCard } from "@/components/cards/PointCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { DEFAULT_SPACE } from "@/constants/config";
import { useBasePath } from "@/hooks/utils/useBasePath";
import { encodeId } from "@/lib/negation-game/encodeId";
import { preventDefaultIfContainsSelection } from "@/lib/utils/preventDefaultIfContainsSelection";
import { useFeed } from "@/queries/feed/useFeed";
import { useSpace } from "@/queries/space/useSpace";
import { usePrivy } from "@privy-io/react-auth";
import { useSetAtom, useAtom } from "jotai";
import { PlusIcon, TrophyIcon, SearchIcon, BrainCircuitIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useState, useMemo, memo, useEffect, useRef } from "react";
import { LeaderboardDialog } from "@/components/dialogs/LeaderboardDialog";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useViewpoints } from "@/queries/viewpoints/useViewpoints";
import { cn } from "@/lib/utils/cn";
import { SearchInput } from "@/components/search/SearchInput";
import { useSearch } from "@/queries/search/useSearch";
import { SearchResultsList } from "@/components/search/SearchResultsList";
import { usePinnedPoint } from "@/queries/points/usePinnedPoint";
import { ViewpointIcon } from "@/components/icons/AppIcons";
import { usePriorityPoints } from "@/queries/points/usePriorityPoints";
import { decodeId } from "@/lib/negation-game/decodeId";
import { useQueryClient } from "@tanstack/react-query";
import { usePrefetchPoint } from "@/queries/points/usePointData";
import React from "react";
import { ViewpointCardWrapper } from "@/components/cards/ViewpointCardWrapper";
import { initialSpaceTabAtom } from "@/atoms/navigationAtom";
import { makePointSuggestionAtom } from "@/atoms/makePointSuggestionAtom";
import { PointFilterSelector } from "@/components/inputs/PointFilterSelector";
import { useTopics } from "@/queries/topics/useTopics";
import { createTopic } from "@/actions/topics/createTopic";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { validateAndFormatUrl } from "@/lib/validation/validateUrl";

interface PageProps {
    params: { space: string };
    searchParams?: { [key: string]: string | string[] | undefined };
}

type PointItem = {
    type: 'point';
    id: string;
    content: string;
    createdAt: Date;
    data: any;
};

type ViewpointItem = {
    type: 'rationale';
    id: string;
    content: string;
    createdAt: Date;
    data: any;
};

type FeedItem = PointItem | ViewpointItem;

type Tab = "all" | "points" | "rationales" | "search";

const MemoizedPointCard = memo(PointCard);
const MemoizedViewpointCardWrapper = memo(ViewpointCardWrapper);

const FeedItem = memo(({ item, basePath, space, setNegatedPointId, login, user, pinnedPoint, handleCardClick, loadingCardId, onPrefetchPoint }: {
    item: FeedItem;
    basePath: string;
    space: string;
    setNegatedPointId: (id: number) => void;
    login: () => void;
    user: any;
    pinnedPoint: any;
    handleCardClick: (id: string) => void;
    loadingCardId: string | null;
    onPrefetchPoint: (id: number) => void;
}) => {
    const pointId = item.type === 'point' ? item.data.pointId : null;
    const queryClient = useQueryClient();
    const [hasStartedLoading, setHasStartedLoading] = useState(false);
    const favorHistoryKey = useMemo(() => pointId ? [pointId, "favor-history", "1W"] : null, [pointId]);

    const handleHover = useCallback(() => {
        if (!pointId || hasStartedLoading) return;
        setHasStartedLoading(true);
        onPrefetchPoint(pointId);

        if (favorHistoryKey) {
            const existingData = queryClient.getQueryData(favorHistoryKey);
            if (existingData) {
                return;
            }
            import("@/actions/feed/fetchFavorHistory")
                .then(({ fetchFavorHistory }) => {
                    return fetchFavorHistory({ pointId, scale: "1W" });
                })
                .then(data => {
                    if (data && favorHistoryKey) {
                        queryClient.setQueryData(favorHistoryKey, data);
                    }
                })
                .catch(error => {
                    if (process.env.NODE_ENV === "development") {
                        console.warn(`[FeedItem] Failed to fetch favor history for ${pointId}:`, error);
                    }
                });
        }
    }, [pointId, hasStartedLoading, onPrefetchPoint, queryClient, favorHistoryKey]);

    if (item.type === 'point') {
        const point = item.data;
        const isProposalToPin = point.content?.startsWith('/pin ');
        const isPinnedPoint = pinnedPoint && pinnedPoint.pointId === point.pointId;

        let targetPointId;
        if (isProposalToPin) {
            const parts = point.content.split(' ');
            if (parts.length > 1) {
                try {
                    targetPointId = decodeId(parts[1]);
                } catch (e) {
                    const parsedId = parseInt(parts[1], 10);
                    if (!isNaN(parsedId)) {
                        targetPointId = parsedId;
                    }
                }
            }
        }

        let pinStatus;
        if (isProposalToPin) {
            pinStatus = targetPointId
                ? `Proposal to pin point ${targetPointId}`
                : "Proposal to pin";
        } else if (point.pinCommands?.length > 1) {
            pinStatus = `Proposal to pin (${point.pinCommands.length} proposals)`;
        } else if (point.pinCommands?.length === 1) {
            pinStatus = "Proposal to pin";
        }

        const pinnedCommandPointId = isProposalToPin
            ? undefined
            : point.pinCommands?.[0]?.id;

        return (
            <Link
                draggable={false}
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                    preventDefaultIfContainsSelection(e);
                    const isActionButton = (e.target as HTMLElement).closest('[data-action-button="true"]');
                    if (!isActionButton && window.getSelection()?.isCollapsed !== false) {
                        onPrefetchPoint(point.pointId);
                        handleCardClick(`point-${point.pointId}`);
                    }
                }}
                href={`${basePath}/${encodeId(point.pointId)}`}
                className="flex border-b cursor-pointer hover:bg-accent"
                onMouseEnter={handleHover}
            >
                <MemoizedPointCard
                    onNegate={(e) => {
                        e.preventDefault();
                        if (user !== null) {
                            setNegatedPointId(point.pointId);
                        } else {
                            login();
                        }
                    }}
                    className="flex-grow p-6"
                    favor={point.favor}
                    content={point.content}
                    createdAt={point.createdAt}
                    amountSupporters={point.amountSupporters}
                    amountNegations={point.amountNegations}
                    pointId={point.pointId}
                    cred={point.cred}
                    viewerContext={{ viewerCred: point.viewerCred }}
                    isCommand={point.isCommand}
                    isPinned={isPinnedPoint}
                    space={space || "global"}
                    pinnedCommandPointId={pinnedCommandPointId}
                    pinStatus={pinStatus}
                    onPinBadgeClickCapture={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                    linkDisabled={true}
                    disablePopover={true}
                    isLoading={loadingCardId === `point-${point.pointId}`}
                />
            </Link>
        );
    } else if (item.type === 'rationale') {
        const viewpoint = item.data;

        let pointIds: number[] = viewpoint.originalPointIds || [];

        if ((!pointIds || pointIds.length === 0) && viewpoint.graph?.nodes) {
            try {
                pointIds = viewpoint.graph.nodes
                    .filter((node: any) => node.type === 'point')
                    .map((node: any) => {
                        const id = node.data?.pointId;
                        return typeof id === 'number' ? id : null;
                    })
                    .filter((id: any) => id !== null);

            } catch (error) {
            }
        }

        return (
            <MemoizedViewpointCardWrapper
                key={`rationale-${item.id}`}
                id={viewpoint.id}
                authorId={viewpoint.authorId}
                title={viewpoint.title}
                description={viewpoint.description}
                author={viewpoint.authorUsername}
                createdAt={viewpoint.createdAt}
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
        );
    }

    return null;
});
FeedItem.displayName = 'FeedItem';

const PriorityPointItem = memo(({ point, basePath, space, setNegatedPointId, login, user, pinnedPoint, loadingCardId, handleCardClick, onPrefetchPoint }: any) => {
    const queryClient = useQueryClient();
    const [hasStartedLoading, setHasStartedLoading] = useState(false);
    const favorHistoryKey = useMemo(() => [point.pointId, "favor-history", "1W"], [point.pointId]);

    const handlePrefetch = useCallback(() => {
        if (!point.pointId || hasStartedLoading) return;
        setHasStartedLoading(true);
        onPrefetchPoint(point.pointId);

        const existingData = queryClient.getQueryData(favorHistoryKey);
        if (existingData) {
            return;
        }

        import("@/actions/feed/fetchFavorHistory")
            .then(({ fetchFavorHistory }) => {
                return fetchFavorHistory({
                    pointId: point.pointId,
                    scale: "1W"
                });
            })
            .then(data => {
                if (data) {
                    queryClient.setQueryData(favorHistoryKey, data);
                }
            })
            .catch(error => {
                if (process.env.NODE_ENV === "development") {
                    console.warn(`[PriorityPointItem] Failed to fetch favor history for ${point.pointId}:`, error);
                }
            });
    }, [point.pointId, onPrefetchPoint, hasStartedLoading, queryClient, favorHistoryKey]);

    let pinStatus;
    if (point.pinCommands?.length > 1) {
        pinStatus = `Proposal to pin (${point.pinCommands.length} proposals)`;
    } else if (point.pinCommands?.length === 1) {
        pinStatus = "Proposal to pin";
    }

    const pinnedCommandPointId = point.pinCommands?.[0]?.id;

    return (
        <div className="relative">
            <Link
                key={`priority-${point.pointId}`}
                draggable={false}
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                    preventDefaultIfContainsSelection(e);
                    const isActionButton = (e.target as HTMLElement).closest('[data-action-button="true"]');
                    if (!isActionButton && window.getSelection()?.isCollapsed !== false) {
                        handleCardClick(`point-${point.pointId}`);
                    }
                }}
                href={`${basePath}/${encodeId(point.pointId)}`}
                className="flex border-b cursor-pointer hover:bg-accent"
                onMouseEnter={handlePrefetch}
            >
                <MemoizedPointCard
                    className="flex-grow p-6"
                    amountSupporters={point.amountSupporters}
                    createdAt={point.createdAt}
                    cred={point.cred}
                    pointId={point.pointId}
                    favor={point.favor}
                    amountNegations={point.amountNegations}
                    content={point.content}
                    viewerContext={{ viewerCred: point.viewerCred }}
                    isCommand={point.isCommand}
                    space={space}
                    isPriority={true}
                    onNegate={(e) => {
                        e.preventDefault();
                        if (user !== null) {
                            setNegatedPointId(point.pointId);
                        } else {
                            login();
                        }
                    }}
                    pinnedCommandPointId={pinnedCommandPointId}
                    pinStatus={pinStatus}
                    onPinBadgeClickCapture={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                    linkDisabled={true}
                    isLoading={loadingCardId === `point-${point.pointId}`}
                />
            </Link>
        </div>
    );
});
PriorityPointItem.displayName = 'PriorityPointItem';

const PriorityPointsSection = memo(({ filteredPriorityPoints, basePath, space, setNegatedPointId, login, user, selectedTab, pinnedPoint, loadingCardId, handleCardClick, onPrefetchPoint }: any) => {
    if (!filteredPriorityPoints || filteredPriorityPoints.length === 0) return null;

    return (
        <div className="border-b">
            {filteredPriorityPoints.map((point: any) => (
                <PriorityPointItem
                    key={`${selectedTab}-priority-${point.pointId}`}
                    point={point}
                    basePath={basePath}
                    space={space}
                    setNegatedPointId={setNegatedPointId}
                    login={login}
                    user={user}
                    pinnedPoint={pinnedPoint}
                    loadingCardId={loadingCardId}
                    handleCardClick={handleCardClick}
                    onPrefetchPoint={onPrefetchPoint}
                />
            ))}
        </div>
    );
});
PriorityPointsSection.displayName = 'PriorityPointsSection';

const AllTabContent = memo(({ points, viewpoints, isLoading, viewpointsLoading, combinedFeed, basePath, space, setNegatedPointId, login, user, pinnedPoint, loginOrMakePoint, handleNewViewpoint, handleCardClick, loadingCardId, onPrefetchPoint }: {
    points: any[] | undefined;
    viewpoints: any[] | undefined;
    isLoading: boolean;
    viewpointsLoading: boolean;
    combinedFeed: FeedItem[];
    basePath: string;
    space: string;
    setNegatedPointId: (id: number) => void;
    login: () => void;
    user: any;
    pinnedPoint: any;
    loginOrMakePoint: () => void;
    handleNewViewpoint: () => void;
    handleCardClick: (id: string) => void;
    loadingCardId: string | null;
    onPrefetchPoint: (id: number) => void;
}) => {
    if (!points || !viewpoints || isLoading || viewpointsLoading) {
        return <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-200px)]">
            <Loader className="h-6 w-6" />
        </div>;
    }

    if (points.length === 0 && viewpoints.length === 0) {
        return (
            <div className="flex flex-col flex-grow items-center justify-center gap-4 py-12 text-center min-h-[50vh]">
                <span className="text-muted-foreground">Nothing here yet</span>
                <div className="flex items-center justify-center gap-3">
                    <Button variant="outline" onClick={loginOrMakePoint}>
                        <PlusIcon className="mr-2 size-4" />
                        Make a Point
                    </Button>
                    <span className="text-muted-foreground">or</span>
                    <Button variant="outline" onClick={handleNewViewpoint}>
                        <ViewpointIcon className="mr-2.5 size-4" />
                        Create a Rationale
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <>
            {combinedFeed.map((item: FeedItem) => (
                <FeedItem
                    key={item.id}
                    item={item}
                    basePath={basePath}
                    space={space}
                    setNegatedPointId={setNegatedPointId}
                    login={login}
                    user={user}
                    pinnedPoint={pinnedPoint}
                    handleCardClick={handleCardClick}
                    loadingCardId={loadingCardId}
                    onPrefetchPoint={onPrefetchPoint}
                />
            ))}
        </>
    );
});
AllTabContent.displayName = 'AllTabContent';

const PointsTabContent = memo(({ points, isLoading, combinedFeed, basePath, space, setNegatedPointId, login, user, pinnedPoint, loginOrMakePoint, handleCardClick, loadingCardId, onPrefetchPoint }: {
    points: any[] | undefined;
    isLoading: boolean;
    combinedFeed: FeedItem[];
    basePath: string;
    space: string;
    setNegatedPointId: (id: number) => void;
    login: () => void;
    user: any;
    pinnedPoint: any;
    loginOrMakePoint: () => void;
    handleCardClick: (id: string) => void;
    loadingCardId: string | null;
    onPrefetchPoint: (id: number) => void;
}) => {
    const pointItems = useMemo(() => {
        return combinedFeed.filter((item: FeedItem) => item.type === 'point');
    }, [combinedFeed]);

    if (isLoading) {
        return <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-200px)]">
            <Loader className="h-6 w-6" />
        </div>;
    }

    if (points?.length === 0 && !pinnedPoint && pointItems.length === 0) {
        return (
            <div className="flex flex-col flex-grow items-center justify-center gap-4 py-12 text-center min-h-[50vh]">
                <span className="text-muted-foreground">Nothing here yet</span>
                <Button variant="outline" onClick={loginOrMakePoint}>
                    <PlusIcon className="mr-2 size-4" />
                    Make a Point
                </Button>
            </div>
        );
    }

    return (
        <>
            {pointItems.map((item: FeedItem) => (
                <FeedItem
                    key={item.id}
                    item={item}
                    basePath={basePath}
                    space={space}
                    setNegatedPointId={setNegatedPointId}
                    login={login}
                    user={user}
                    pinnedPoint={pinnedPoint}
                    handleCardClick={handleCardClick}
                    loadingCardId={loadingCardId}
                    onPrefetchPoint={onPrefetchPoint}
                />
            ))}
        </>
    );
});
PointsTabContent.displayName = 'PointsTabContent';

const RationalesTabContent = memo(({ viewpoints, viewpointsLoading, basePath, space, handleNewViewpoint, handleCardClick, loadingCardId, points }: any) => {
    const [selectedPointIds, setSelectedPointIds] = useState<number[]>([]);
    const [matchType, setMatchType] = useState<"any" | "all">("any");
    const [topicFilters, setTopicFilters] = useState<string[]>([]);
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
            setTopicFilters((prev: string[]) => [...prev, newTopicName.trim()]);
            setNewTopicDialogOpen(false);
        } finally {
            setIsSubmittingTopic(false);
        }
    };

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDiscourseUrl(e.target.value);
        setUrlError(null);
    };

    const filteredViewpoints = useMemo(() => {
        if (!selectedPointIds.length) return viewpoints;
        return viewpoints?.filter((viewpoint: any) => {
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

    const finalFilteredViewpoints = useMemo(() => {
        if (topicFilters.length === 0) return filteredViewpoints;
        return filteredViewpoints.filter((vp: any) => {
            if (!vp.topic) return false;
            const vt = vp.topic.toLowerCase();
            return topicFilters.some((f: string) => vt.includes(f.toLowerCase()));
        });
    }, [filteredViewpoints, topicFilters]);

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
        return <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-200px)]">
            <Loader className="h-6 w-6" />
        </div>;
    }

    return (
        <div className="flex flex-col">
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
                            onClick={(e) => {
                                if (topicFilters.length > 0) {
                                    setTopicFilters([]);
                                }
                            }}
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
                                                        setTopicFilters((prev: string[]) => prev.filter(t => t !== topicName));
                                                    } else {
                                                        setTopicFilters((prev: string[]) => [...prev, topicName]);
                                                    }
                                                }}
                                            >
                                                {topicName}
                                            </Button>
                                        </TooltipTrigger>
                                        {validUrl && (
                                            <TooltipContent side="bottom">
                                                Related: <a
                                                    href={validUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        window.open(validUrl, '_blank');
                                                    }}
                                                >
                                                    {validUrl}
                                                </a>
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
                                        setTopicFilters(prevFilters =>
                                            prevFilters.filter(filter =>
                                                visibleTopicNamesAfterCollapse.includes(filter)
                                            )
                                        );
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
                                    if (e.key === "Enter" && newTopicName.trim()) {
                                        handleDialogAddTopic();
                                    }
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
                            {urlError && (
                                <p className="text-sm text-destructive mt-1">{urlError}</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setNewTopicDialogOpen(false)} disabled={isSubmittingTopic}>
                            Cancel
                        </Button>
                        <Button onClick={handleDialogAddTopic} disabled={!newTopicName.trim() || isSubmittingTopic}>
                            Add Topic
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <PointFilterSelector
                points={points || []}
                selectedPointIds={selectedPointIds}
                onPointSelect={handlePointSelect}
                onPointDeselect={handlePointDeselect}
                onClearAll={handleClearAll}
                matchType={matchType}
                onMatchTypeChange={handleMatchTypeChange}
            />

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
                finalFilteredViewpoints.map((viewpoint: any) => {
                    return (
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
                    );
                })
            )}
        </div>
    );
});
RationalesTabContent.displayName = 'RationalesTabContent';

const PinnedPointWithHistory = memo(({ pinnedPoint, space, loadingCardId }: any) => {
    const [hasStartedLoading, setHasStartedLoading] = useState(false);
    const queryClient = useQueryClient();
    const favorHistoryKey = useMemo(() => [pinnedPoint.pointId, "favor-history", "1W"], [pinnedPoint.pointId]);

    useEffect(() => {
        if (!pinnedPoint.pointId || hasStartedLoading) return;

        setHasStartedLoading(true);


        const existingData = queryClient.getQueryData(favorHistoryKey);
        if (existingData) {
            return;
        }
        import("@/actions/feed/fetchFavorHistory")
            .then(({ fetchFavorHistory }) => {
                return fetchFavorHistory({
                    pointId: pinnedPoint.pointId,
                    scale: "1W"
                });
            })
            .then(data => {
                if (data) {
                    queryClient.setQueryData(favorHistoryKey, data);
                }
            })
            .catch(error => {
            });
    }, [pinnedPoint.pointId, hasStartedLoading, queryClient, favorHistoryKey]);

    return (
        <PointCard
            className="flex-grow p-6"
            amountSupporters={pinnedPoint.amountSupporters}
            createdAt={pinnedPoint.createdAt}
            cred={pinnedPoint.cred}
            pointId={pinnedPoint.pointId}
            favor={pinnedPoint.favor}
            amountNegations={pinnedPoint.amountNegations}
            content={pinnedPoint.content}
            viewerContext={{ viewerCred: pinnedPoint.viewerCred }}
            isPinned={true}
            isCommand={pinnedPoint.isCommand}
            space={space}
            pinnedCommandPointId={pinnedPoint.pinCommands?.[0]?.id}
            onPinBadgeClickCapture={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
            pinStatus={
                pinnedPoint.pinCommands?.length > 1
                    ? `Pinned by command (${pinnedPoint.pinCommands.length} competing proposals)`
                    : pinnedPoint.pinCommands?.length === 1
                        ? "Pinned by command"
                        : "Pinned by command"
            }
            linkDisabled={true}
            isLoading={loadingCardId === `point-${pinnedPoint.pointId}`}
        />
    );
});
PinnedPointWithHistory.displayName = 'PinnedPointWithHistory';

export function SpacePageClient({ params, searchParams: pageSearchParams }: PageProps) {
    const { user: privyUser, login } = usePrivy();
    const setMakePointSuggestion = useSetAtom(makePointSuggestionAtom);
    const basePath = useBasePath();
    const space = useSpace(params.space);
    const [leaderboardOpen, setLeaderboardOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const [isNavigating, setIsNavigating] = useState(false);
    const [initialTabFromAtom, setInitialTabAtom] = useAtom(initialSpaceTabAtom);
    const queryClient = useQueryClient();
    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    const searchParams = useSearchParams();
    const isSharedView = searchParams?.get('view') === 'shared';
    const sharedPointsStr = searchParams?.get('points') || undefined;
    const sharedPoints = sharedPointsStr ? sharedPointsStr.split(',').map(Number).filter(Boolean) : [];
    const sharedBy = searchParams?.get('by') || undefined;

    const lastTabViewTimes = useRef<Record<string, number>>({
        rationales: 0,
        points: 0,
        all: 0,
        search: 0
    });

    const { data: viewpoints, isLoading: viewpointsLoading } = useViewpoints(space.data?.id || "global");

    const [selectedTab, setSelectedTab] = useState<Tab | null>(null);
    const [isAiAssistantLoading, setIsAiAssistantLoading] = useState(false);


    useEffect(() => {
        if (selectedTab === null && initialTabFromAtom) {
            setSelectedTab(initialTabFromAtom);
            setInitialTabAtom(null);
        } else if (selectedTab === null && !initialTabFromAtom) {
            setSelectedTab("rationales");
        }
    }, [initialTabFromAtom, selectedTab, setInitialTabAtom]);

    const { searchQuery, searchResults, isLoading: searchLoading, handleSearch, isActive, hasSearched } = useSearch();
    const [loadingCardId, setLoadingCardId] = useState<string | null>(null);

    const handleCardClick = useCallback((id: string) => {
        setLoadingCardId(id);
    }, []);

    useEffect(() => {
        setLoadingCardId(null);
        setIsAiAssistantLoading(false);
        return () => {
            setLoadingCardId(null);
            setIsAiAssistantLoading(false);
        };
    }, [pathname]);

    useEffect(() => {
        if (privyUser?.id && isNavigating) {
            queryClient.setQueryData(["feed", privyUser?.id], (oldData: any) => oldData);
        }
    }, [queryClient, privyUser?.id, isNavigating]);

    const { data: points, isLoading } = useFeed();

    const {
        data: priorityPoints,
        isLoading: priorityPointsLoading
    } = usePriorityPoints();

    const shouldLoadPinnedPoint = space.data?.id !== "global";

    const { data: pinnedPoint, isLoading: pinnedPointLoading } = usePinnedPoint(
        shouldLoadPinnedPoint ? space.data?.id : undefined
    );

    const handleTabChange = useCallback((tab: Tab) => {
        setSelectedTab(tab);

        if (lastTabViewTimes.current) {
            lastTabViewTimes.current[tab] = Date.now();
        }

        if (tab === "search") {
            setTimeout(() => {
                const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
                if (searchInput) searchInput.focus();
            }, 0);
        }
    }, []);

    const handleNewViewpoint = () => {
        if (privyUser) {
            setIsNavigating(true);
            router.push(`${basePath}/rationale/new`);
        } else {
            login();
        }
    };

    const setNegatedPointId = useSetAtom(negatedPointIdAtom);

    const isInSpecificSpace = pathname?.includes('/s/') && !pathname.match(/^\/s\/global\//);

    const loginOrMakePoint = useCallback(() => {
        if (privyUser !== null) {
            setMakePointSuggestion({ text: "", context: "space" });
        } else {
            login();
        }
    }, [privyUser, login, setMakePointSuggestion]);

    const filteredPriorityPoints = useMemo(() => {
        if (!priorityPoints || priorityPointsLoading) return [];

        const uniquePriorityPoints = Array.from(
            new Map(priorityPoints.map(point => [point.pointId, point])).values()
        );

        return uniquePriorityPoints.filter(point => {
            return !pinnedPoint || point.pointId !== pinnedPoint.pointId;
        });
    }, [priorityPoints, pinnedPoint, priorityPointsLoading]);

    const pinnedAndPriorityPoints = useMemo(() => {
        const pointIds = new Set<number>();

        if (filteredPriorityPoints?.length) {
            filteredPriorityPoints.forEach(point => pointIds.add(point.pointId));
        }

        if (pinnedPoint?.pointId) {
            pointIds.add(pinnedPoint.pointId);
        }


        return pointIds;
    }, [filteredPriorityPoints, pinnedPoint]);

    const combinedFeed = useMemo(() => {
        if (!points) {
            return [];
        }
        const allItems: FeedItem[] = [];

        const includePoints = selectedTab !== "rationales";
        const includeRationales = selectedTab === "all" || selectedTab === "rationales";

        if (includePoints && Array.isArray(points)) {
            points
                .filter((point: any) => !pinnedAndPriorityPoints.has(point.pointId))
                .forEach((point: any) => {
                    allItems.push({
                        type: 'point',
                        id: `point-${point.pointId}`,
                        content: point.content,
                        createdAt: point.createdAt,
                        data: point,
                    });
                });
        }

        if (includeRationales && viewpoints) {
            viewpoints.forEach(viewpoint => {
                allItems.push({
                    type: 'rationale',
                    id: viewpoint.id,
                    content: viewpoint.title,
                    createdAt: viewpoint.createdAt,
                    data: viewpoint,
                });
            });
        }

        return allItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }, [points, viewpoints, pinnedAndPriorityPoints, selectedTab]);

    const handleSearchChange = (value: string) => {
        handleSearch(value);
        if (value.trim().length > 0 && selectedTab !== "search") {
            setSelectedTab("search");
        }
    };

    const handlePinnedPointClick = (e: React.MouseEvent, encodedId: string) => {
        preventDefaultIfContainsSelection(e);
        router.push(`${basePath}/${encodedId}`);
    }

    const prefetchPoint = usePrefetchPoint();

    const handleAiAssistantClick = () => {
        setIsAiAssistantLoading(true);
        router.push(`${basePath}/chat`);
    };

    if (selectedTab === null) {
        return (
            <main className="sm:grid sm:grid-cols-[1fr_minmax(200px,600px)_1fr] flex-grow bg-background">
                <div className="relative w-full sm:col-[2] flex flex-col gap-0 border-x overflow-auto">
                    <Loader className="absolute self-center my-auto top-0 bottom-0" />
                </div>
            </main>
        );
    }

    return (
        <main className="sm:grid sm:grid-cols-[1fr_minmax(200px,600px)_1fr] flex-grow bg-background">
            <div className="relative w-full sm:col-[2] flex flex-col gap-0 border-x overflow-auto">
                {space && space.data && space.data.id !== DEFAULT_SPACE && (
                    <div className="py-3 px-4 flex items-center justify-between gap-3 w-full border-b">
                        <div className="flex items-center gap-3">
                            <Avatar className="border-2 sm:border-4 border-background h-12 w-12 sm:h-20 sm:w-20">
                                {space.data.icon && (
                                    <AvatarImage
                                        src={space.data.icon}
                                        alt={`s/${space.data.id} icon`}
                                    />
                                )}
                                <AvatarFallback className="text-2xl sm:text-4xl font-bold text-muted-foreground">
                                    {space.data.id.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <h1 className="text-lg sm:text-xl font-semibold">s/{space.data.id}</h1>
                        </div>
                        <Button
                            asChild={false}
                            onClick={handleAiAssistantClick}
                            disabled={isAiAssistantLoading}
                            className="h-12 w-auto px-6"
                        >
                            {isAiAssistantLoading ? (
                                <>
                                    <Loader className="size-6 mr-sm text-white" />
                                    <span>Loading...</span>
                                </>
                            ) : (
                                <>
                                    <BrainCircuitIcon className="size-6" />
                                    <span className="ml-sm">AI Assistant</span>
                                </>
                            )}
                        </Button>
                    </div>
                )}

                <div className="flex flex-col gap-4 px-4 sm:px-lg py-3 sm:py-sm border-b">
                    <div className="flex gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => {
                                handleTabChange("rationales");
                            }}
                            className={cn(
                                "py-1.5 sm:py-2 px-3 sm:px-4 rounded text-sm sm:text-base whitespace-nowrap focus:outline-none",
                                selectedTab === "rationales" ? "bg-primary text-white" : "bg-transparent text-primary"
                            )}
                        >
                            Rationales
                        </button>
                        <button
                            onClick={() => {
                                handleTabChange("points");
                            }}
                            className={cn(
                                "py-1.5 sm:py-2 px-3 sm:px-4 rounded text-sm sm:text-base whitespace-nowrap focus:outline-none",
                                selectedTab === "points" ? "bg-primary text-white" : "bg-transparent text-primary"
                            )}
                        >
                            Points
                        </button>
                        <button
                            onClick={() => {
                                handleTabChange("all");
                            }}
                            className={cn(
                                "py-1.5 sm:py-2 px-3 sm:px-4 rounded text-sm sm:text-base whitespace-nowrap focus:outline-none",
                                selectedTab === "all" ? "bg-primary text-white" : "bg-transparent text-primary"
                            )}
                        >
                            All
                        </button>
                        <button
                            onClick={() => {
                                handleTabChange("search");
                            }}
                            className={cn(
                                "py-1.5 sm:py-2 px-3 sm:px-4 rounded text-sm sm:text-base whitespace-nowrap focus:outline-none flex items-center gap-1",
                                selectedTab === "search" ? "bg-primary text-white" : "bg-transparent text-primary"
                            )}
                        >
                            <SearchIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span>Search</span>
                        </button>
                        {space?.data?.id === DEFAULT_SPACE && (
                            <Button
                                asChild={false}
                                onClick={handleAiAssistantClick}
                                disabled={isAiAssistantLoading}
                                className="ml-auto py-1.5 sm:py-2 px-2 sm:px-4 text-xs sm:text-sm flex items-center gap-1"
                                variant="ghost"
                            >
                                {isAiAssistantLoading ? (
                                    <>
                                        <Loader className="size-3.5 sm:size-4 mr-1" />
                                        <span className="hidden sm:inline">Loading...</span>
                                    </>
                                ) : (
                                    <>
                                        <BrainCircuitIcon className="size-3.5 sm:size-4" />
                                        <span className="hidden sm:inline">AI Assistant</span>
                                    </>
                                )}
                            </Button>
                        )}
                    </div>

                    {selectedTab === "search" && (
                        <div className="pb-2">
                            <SearchInput
                                value={searchQuery}
                                onChange={handleSearchChange}
                                placeholder="Search points, rationales, or authors..."
                            />
                        </div>
                    )}
                </div>

                {selectedTab === null && (
                    <div className="flex items-center justify-center flex-1 min-h-[50vh]">
                        <Loader className="h-6 w-6" />
                    </div>
                )}

                {selectedTab !== "search" && selectedTab !== "rationales" &&
                    pinnedPoint && !pinnedPointLoading && isInSpecificSpace && (
                        <div className="border-b transition-opacity duration-200 ease-in-out">
                            <Link
                                draggable={false}
                                onClick={(e: React.MouseEvent) => {
                                    preventDefaultIfContainsSelection(e);
                                    const isActionButton = (e.target as HTMLElement).closest('[data-action-button="true"]');
                                    if (!isActionButton && window.getSelection()?.isCollapsed !== false) {
                                        handleCardClick(`point-${pinnedPoint.pointId}`);
                                    }
                                }}
                                href={`${basePath}/${encodeId(pinnedPoint.pointId)}`}
                                className="flex cursor-pointer hover:bg-accent"
                                onMouseEnter={() => prefetchPoint(pinnedPoint.pointId)}
                            >
                                <PinnedPointWithHistory
                                    pinnedPoint={pinnedPoint}
                                    space={space.data?.id}
                                    loadingCardId={loadingCardId}
                                />
                            </Link>
                        </div>
                    )}

                {selectedTab !== "search" && selectedTab !== "rationales" &&
                    (priorityPointsLoading ? (
                        <div className="border-b py-4 px-6 min-h-[120px] flex items-center justify-center">
                            <div className="animate-pulse flex flex-col w-full gap-2">
                                <div className="h-6 bg-muted rounded w-3/4"></div>
                                <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
                                <div className="h-3 bg-muted rounded w-1/4 mt-2"></div>
                                <div className="flex gap-2 mt-2">
                                    <div className="h-5 w-5 bg-muted rounded-full"></div>
                                    <div className="h-5 w-5 bg-muted rounded-full"></div>
                                    <div className="h-5 w-5 bg-muted rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    ) : filteredPriorityPoints.length > 0 ? (
                        <div className="border-b transition-opacity duration-200 ease-in-out">
                            <PriorityPointsSection
                                filteredPriorityPoints={filteredPriorityPoints}
                                basePath={basePath}
                                space={space.data?.id}
                                setNegatedPointId={setNegatedPointId}
                                login={login}
                                user={privyUser}
                                selectedTab={selectedTab}
                                pinnedPoint={pinnedPoint}
                                loadingCardId={loadingCardId}
                                handleCardClick={handleCardClick}
                                onPrefetchPoint={prefetchPoint}
                            />
                        </div>
                    ) : null)}

                {selectedTab === "search" ? (
                    <SearchResultsList
                        results={searchResults}
                        isLoading={searchLoading}
                        query={searchQuery}
                        hasSearched={hasSearched}
                        loadingCardId={loadingCardId}
                        handleCardClick={handleCardClick}
                    />
                ) : selectedTab === "all" ? (
                    <AllTabContent
                        points={Array.isArray(points) ? points : []}
                        viewpoints={viewpoints}
                        isLoading={isLoading}
                        viewpointsLoading={viewpointsLoading}
                        combinedFeed={combinedFeed}
                        basePath={basePath}
                        space={space.data?.id ?? "global"}
                        setNegatedPointId={setNegatedPointId}
                        login={login}
                        user={privyUser}
                        pinnedPoint={pinnedPoint}
                        loginOrMakePoint={loginOrMakePoint}
                        handleNewViewpoint={handleNewViewpoint}
                        handleCardClick={handleCardClick}
                        loadingCardId={loadingCardId}
                        onPrefetchPoint={prefetchPoint}
                    />
                ) : selectedTab === "points" ? (
                    <PointsTabContent
                        points={Array.isArray(points) ? points : []}
                        isLoading={isLoading}
                        combinedFeed={combinedFeed}
                        basePath={basePath}
                        space={space.data?.id ?? "global"}
                        setNegatedPointId={setNegatedPointId}
                        login={login}
                        user={privyUser}
                        pinnedPoint={pinnedPoint}
                        loginOrMakePoint={loginOrMakePoint}
                        handleCardClick={handleCardClick}
                        loadingCardId={loadingCardId}
                        onPrefetchPoint={prefetchPoint}
                    />
                ) : (
                    <RationalesTabContent
                        viewpoints={viewpoints}
                        viewpointsLoading={viewpointsLoading}
                        basePath={basePath}
                        space={space.data?.id}
                        handleNewViewpoint={handleNewViewpoint}
                        handleCardClick={handleCardClick}
                        loadingCardId={loadingCardId}
                        points={points}
                    />
                )}
            </div>
            <div className="fixed bottom-md right-sm sm:right-md flex flex-col items-end gap-3">
                <Button
                    className="aspect-square rounded-full h-[58px] w-[58px] sm:h-10 sm:w-[160px] order-3"
                    onClick={loginOrMakePoint}
                >
                    <PlusIcon className="size-7 sm:size-5" />
                    <span className="hidden sm:block ml-sm">Make a Point</span>
                </Button>

                <Button
                    className="aspect-square rounded-full h-[58px] w-[58px] sm:h-10 sm:w-[160px] order-2"
                    onClick={handleNewViewpoint}
                    rightLoading={isNavigating}
                >
                    {isNavigating ? (
                        <>
                            <span className="hidden sm:block">Creating...</span>
                            <Loader className="sm:hidden size-5 text-primary mx-auto" />
                        </>
                    ) : (
                        <>
                            <ViewpointIcon />
                            <span className="hidden sm:block ml-sm">New Rationale</span>
                        </>
                    )}
                </Button>

                <Button
                    variant="ghost"
                    className="aspect-square rounded-full h-[58px] w-[58px] sm:h-10 sm:w-auto sm:px-6 order-0"
                    onClick={() => setLeaderboardOpen(true)}
                >
                    <TrophyIcon className="size-7 sm:size-5" />
                    <span className="hidden sm:block ml-sm">Leaderboard</span>
                </Button>
            </div>

            <LeaderboardDialog
                open={leaderboardOpen}
                onOpenChange={setLeaderboardOpen}
                space={space.data?.id || "global"}
            />
        </main>
    );
} 