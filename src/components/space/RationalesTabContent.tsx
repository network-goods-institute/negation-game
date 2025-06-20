"use client";

import React, { memo, useState, useMemo, useCallback, useEffect } from "react";
import { Loader } from "@/components/ui/loader";
import { ViewpointCardWrapper } from "@/components/cards/ViewpointCardWrapper";
import { useInfiniteScroll } from "@/hooks/ui/useInfiniteScroll";
import { NewRationaleButton } from "@/components/rationale/NewRationaleButton";
import { FilteringTabContent } from "./FilteringTabContent";

const MemoizedViewpointCardWrapper = memo(ViewpointCardWrapper);

export interface RationalesTabContentProps {
    viewpoints: any[] | undefined;
    viewpointsLoading: boolean;
    space: string;
    handleNewViewpoint: () => void;
    isNewRationaleLoading?: boolean;
    handleCardClick: (id: string) => void;
    loadingCardId: string | null;
    points: any[] | undefined;
    selectedPointIds: number[];
    matchType: "any" | "all";
    topicFilters: string[];
    filtersOpen: boolean;
    onPointSelect: (pointId: number) => void;
    onPointDeselect: (pointId: number) => void;
    onClearAll: () => void;
    onMatchTypeChange: (type: "any" | "all") => void;
    onTopicFiltersChange: (filters: string[]) => void;
}

export const RationalesTabContent = memo(({
    viewpoints,
    viewpointsLoading,
    space,
    handleNewViewpoint,
    isNewRationaleLoading = false,
    handleCardClick,
    loadingCardId,
    points,
    selectedPointIds,
    matchType,
    topicFilters,
    filtersOpen,
    onPointSelect,
    onPointDeselect,
    onClearAll,
    onMatchTypeChange,
    onTopicFiltersChange,
}: RationalesTabContentProps) => {

    if (!space) {
        throw new Error("Space is required to load topics");
    }

    // Filter viewpoints based on selected points
    const pointFilteredViewpoints = useMemo<any[]>(() => {
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

    // Filter viewpoints based on selected topics
    const finalFilteredViewpoints = useMemo<any[]>(() => {
        if (topicFilters.length === 0) return pointFilteredViewpoints;
        return pointFilteredViewpoints.filter((vp: any) => {
            if (!vp.topic) return false;
            const vt = vp.topic.toLowerCase();
            return topicFilters.some((f: string) => vt.includes(f.toLowerCase()));
        });
    }, [pointFilteredViewpoints, topicFilters]);

    const [visibleCount, setVisibleCount] = useState(20);
    const visibleViewpoints = useMemo(() => finalFilteredViewpoints.slice(0, visibleCount), [finalFilteredViewpoints, visibleCount]);

    const loadMore = useCallback(() => {
        setVisibleCount(c => Math.min(c + 20, finalFilteredViewpoints.length));
    }, [finalFilteredViewpoints.length]);

    const sentinelRef = useInfiniteScroll(loadMore, [finalFilteredViewpoints.length]);

    // Reset visibleCount when filtered viewpoints change
    useEffect(() => {
        setVisibleCount(20);
    }, [finalFilteredViewpoints]);

    if (viewpoints === undefined || viewpointsLoading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-200px)]">
                <Loader className="h-6 w-6" />
            </div>
        );
    }

    const hasActiveFilters = selectedPointIds.length > 0 || topicFilters.length > 0;

    return (
        <div className="flex flex-col">
            {/* Show filtering controls when filtersOpen is true */}
            {filtersOpen && (
                <div className="border-b bg-muted/20">
                    <FilteringTabContent
                        space={space}
                        points={points || []}
                        selectedPointIds={selectedPointIds}
                        onPointSelect={onPointSelect}
                        onPointDeselect={onPointDeselect}
                        onClearAll={onClearAll}
                        matchType={matchType}
                        onMatchTypeChange={onMatchTypeChange}
                        topicFilters={topicFilters}
                        onTopicFiltersChange={onTopicFiltersChange}
                    />
                </div>
            )}

            {hasActiveFilters && (
                <div className="px-4 py-3 bg-muted/30 border-b">
                    <div className="text-sm text-muted-foreground">
                        {selectedPointIds.length > 0 && (
                            <span>
                                Showing rationales containing {matchType === "all" ? "all" : "any of"} {selectedPointIds.length} selected point{selectedPointIds.length > 1 ? "s" : ""}
                            </span>
                        )}
                        {selectedPointIds.length > 0 && topicFilters.length > 0 && <span> and </span>}
                        {topicFilters.length > 0 && (
                            <span>
                                in topic{topicFilters.length > 1 ? "s" : ""}: {topicFilters.join(", ")}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {finalFilteredViewpoints.length === 0 ? (
                <div className="flex flex-col flex-grow items-center justify-center gap-4 py-12 text-center min-h-[50vh]">
                    <span className="text-muted-foreground">
                        {hasActiveFilters
                            ? `No rationales found matching the current filters`
                            : "Nothing here yet"}
                    </span>
                    <NewRationaleButton
                        onClick={handleNewViewpoint}
                        variant="outline"
                        size="md"
                        loading={isNewRationaleLoading}
                    />
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
                        <div className="flex justify-center my-4" ref={sentinelRef}>
                            <Loader className="h-6 w-6" />
                        </div>
                    )}
                </>
            )}
        </div>
    );
});

RationalesTabContent.displayName = 'RationalesTabContent'; 