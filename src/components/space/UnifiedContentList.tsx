"use client";

import React, { memo, useMemo, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon } from "lucide-react";
import { FeedItem } from "@/components/space/FeedItem";
import { useInfiniteScroll } from "@/hooks/ui/useInfiniteScroll";
import { FeedSkeleton, InfiniteScrollSkeleton } from "./skeletons";
import { NewRationaleButton } from "@/components/rationale/NewRationaleButton";
import { CreateRationaleViewpointCard } from "@/components/space/CreateRationaleViewpointCard";
import { RationalesConcernsSection } from "@/components/space/RationalesConcernsSection";
import type { SortOrder, ContentType } from "@/types/space";
export type ContentItem = {
  type: 'point' | 'rationale';
  id: string;
  content: string;
  createdAt: Date;
  data: any;
};

export interface UnifiedContentListProps {
  // Data sources
  points?: any[];
  viewpoints?: any[];

  // Loading states
  isLoading: boolean;
  viewpointsLoading?: boolean;

  // Display options
  contentType: ContentType;
  searchQuery?: string;
  basePath: string;
  space: string;
  sortOrder?: SortOrder;

  // Filtering
  selectedPointIds: number[];
  matchType: "any" | "all";
  topicFilters: string[];

  // User/auth
  user: any;
  login: () => void;

  // Interaction handlers
  setNegatedPointId: (id: number) => void;
  handleNewViewpoint: () => void;
  handleCardClick: (id: string, item?: any) => void;
  onPrefetchPoint: (id: number) => void;
  onRefetchFeed?: () => void;

  // UI state
  pinnedPoint?: any;
  loadingCardId: string | null;
  isRefetching?: boolean;
}

export const UnifiedContentList = memo(({
  points,
  viewpoints,
  isLoading,
  viewpointsLoading = false,
  contentType,
  searchQuery,
  basePath,
  space,
  sortOrder = "recent",
  selectedPointIds,
  matchType,
  topicFilters,
  user,
  login,
  setNegatedPointId,
  handleNewViewpoint,
  handleCardClick,
  onPrefetchPoint,
  onRefetchFeed,
  pinnedPoint,
  loadingCardId,
  isRefetching = false,
}: UnifiedContentListProps) => {
  const [visibleCount, setVisibleCount] = useState(20);

  // Build combined feed based on content type and filters
  const filteredContent = useMemo(() => {
    let items: ContentItem[] = [];

    // Otherwise, build from regular content
    const includePoints = contentType !== "rationales";
    const includeRationales = contentType === "all" || contentType === "rationales";
    // When topic filters are active, we need rationales to determine which points belong to topics
    const needRationalesForFiltering = topicFilters.length > 0 && contentType === "points";

    // Add points
    if (includePoints && points) {
      const pointItems = points
        .filter(point => !pinnedPoint || point.pointId !== pinnedPoint.pointId)
        .map(point => ({
          type: 'point' as const,
          id: `point-${point.pointId}`,
          content: point.content,
          createdAt: point.createdAt,
          data: point,
        }));
      items.push(...pointItems);
    }

    // Add rationales (viewpoints)
    if ((includeRationales || needRationalesForFiltering) && viewpoints) {
      const rationaleItems = viewpoints.map(viewpoint => ({
        type: 'rationale' as const,
        id: viewpoint.id,
        content: viewpoint.title,
        createdAt: viewpoint.createdAt,
        data: viewpoint,
      }));
      items.push(...rationaleItems);
    }

    // Apply point filtering for rationales
    if (selectedPointIds.length > 0) {
      items = items.filter(item => {
        if (item.type === 'point') {
          // For points, check if the point ID is in the selected list
          return selectedPointIds.includes(item.data.pointId);
        } else if (item.type === 'rationale') {
          // For rationales, check if they contain any of the selected points
          const viewpoint = item.data;
          if (!viewpoint.graph?.nodes) return false;

          const pointNodes = viewpoint.graph.nodes
            .filter((node: any) => node.type === 'point')
            .map((node: any) => Number(node.data?.pointId));

          if (matchType === "all") {
            return selectedPointIds.every(id => pointNodes.includes(id));
          } else {
            return selectedPointIds.some(id => pointNodes.includes(id));
          }
        }
        return true;
      });
    }

    // Apply topic filtering
    if (topicFilters.length > 0) {
      // First, find all rationales that match the topic filters
      const matchingRationales = items.filter(item => {
        if (item.type !== 'rationale') return false;
        const viewpoint = item.data;
        if (!viewpoint.topic) return false;
        const vt = viewpoint.topic.toLowerCase();
        return topicFilters.some((f: string) => vt.includes(f.toLowerCase()));
      });

      // Extract all point IDs from matching rationales
      const pointIdsInMatchingRationales = new Set<number>();
      matchingRationales.forEach(rationale => {
        const viewpoint = rationale.data;
        if (viewpoint.graph?.nodes) {
          viewpoint.graph.nodes
            .filter((node: any) => node.type === 'point' && node.data?.pointId)
            .forEach((node: any) => {
              pointIdsInMatchingRationales.add(Number(node.data.pointId));
            });
        }
      });

      // Filter items: keep rationales that match topics, and points that are in those rationales
      items = items.filter(item => {
        if (item.type === 'rationale') {
          const viewpoint = item.data;
          if (!viewpoint.topic) return false;
          const vt = viewpoint.topic.toLowerCase();
          return topicFilters.some((f: string) => vt.includes(f.toLowerCase()));
        } else if (item.type === 'point') {
          return pointIdsInMatchingRationales.has(item.data.pointId);
        }
        return false;
      });
    }

    // Apply search filter if there's a search query
    if (searchQuery && searchQuery.trim().length >= 2) {
      const query = searchQuery.trim().toLowerCase();
      items = items.filter(item => {
        if (item.type === 'point') {
          // Search in point content, author username, and source references
          const pointData = item.data;
          const contentMatch = pointData.content?.toLowerCase().includes(query);

          // Search author fields - could be 'username' or 'author'
          const usernameMatch = pointData.username?.toLowerCase().includes(query);
          const authorMatch = pointData.author?.toLowerCase().includes(query);

          const sourceMatch = pointData.sourceText?.toLowerCase().includes(query);
          const sourceUrlMatch = pointData.sourceUrl?.toLowerCase().includes(query);
          return contentMatch || usernameMatch || authorMatch || sourceMatch || sourceUrlMatch;
        } else if (item.type === 'rationale') {
          // Search in rationale title, description, author, topic, and content
          const rationaleData = item.data;
          const titleMatch = rationaleData.title?.toLowerCase().includes(query);
          const descriptionMatch = rationaleData.description?.toLowerCase().includes(query);

          // Search author fields - could be 'author', 'authorUsername', or 'username'
          const authorMatch = rationaleData.author?.toLowerCase().includes(query);
          const authorUsernameMatch = rationaleData.authorUsername?.toLowerCase().includes(query);
          const usernameMatch = rationaleData.username?.toLowerCase().includes(query);

          const topicMatch = rationaleData.topic?.toLowerCase().includes(query);
          const contentMatch = rationaleData.content?.toLowerCase().includes(query);

          // Also search in rationale points if they exist
          let rationalePointsMatch = false;
          if (rationaleData.points && Array.isArray(rationaleData.points)) {
            rationalePointsMatch = rationaleData.points.some((point: any) =>
              point.content?.toLowerCase().includes(query) ||
              point.username?.toLowerCase().includes(query) ||
              point.author?.toLowerCase().includes(query)
            );
          }

          return titleMatch || descriptionMatch || authorMatch || authorUsernameMatch || usernameMatch || topicMatch || contentMatch || rationalePointsMatch;
        }
        return false;
      });
    }

    // If we included rationales only for topic filtering in points mode, remove them now
    if (needRationalesForFiltering) {
      items = items.filter(item => item.type === 'point');
    }

    // Sort based on selected sort order
    return items.sort((a, b) => {
      switch (sortOrder) {
        case "recent":
          return b.createdAt.getTime() - a.createdAt.getTime();
        case "favor":
          const favorA = a.type === 'point' ? (a.data.favor || 0) : (a.data.statistics?.averageFavor || 0);
          const favorB = b.type === 'point' ? (b.data.favor || 0) : (b.data.statistics?.averageFavor || 0);
          return favorB - favorA;
        case "cred":
          const credA = a.type === 'point' ? (a.data.cred || 0) : (a.data.statistics?.totalCred || 0);
          const credB = b.type === 'point' ? (b.data.cred || 0) : (b.data.statistics?.totalCred || 0);
          return credB - credA;
        case "activity":
          const activityA = a.type === 'point'
            ? (a.data.amountSupporters || 0) + (a.data.amountNegations || 0)
            : (a.data.statistics?.views || 0) + (a.data.statistics?.copies || 0);
          const activityB = b.type === 'point'
            ? (b.data.amountSupporters || 0) + (b.data.amountNegations || 0)
            : (b.data.statistics?.views || 0) + (b.data.statistics?.copies || 0);
          return activityB - activityA;
        default:
          return b.createdAt.getTime() - a.createdAt.getTime();
      }
    });
  }, [points, viewpoints, searchQuery, contentType, selectedPointIds, matchType, topicFilters, pinnedPoint, sortOrder]);

  const visibleItems = useMemo(() =>
    filteredContent.slice(0, visibleCount),
    [filteredContent, visibleCount]
  );

  const loadMore = useCallback(() => {
    setVisibleCount(c => Math.min(c + 10, filteredContent.length));
  }, [filteredContent.length]);

  const sentinelRef = useInfiniteScroll(loadMore, [filteredContent.length]);

  // Reset visible count when content changes
  useEffect(() => {
    setVisibleCount(20);
  }, [contentType, selectedPointIds.length, topicFilters.length, searchQuery]);

  // Loading state
  if (isLoading || viewpointsLoading) {
    return <FeedSkeleton count={12} pointRatio={contentType === "points" ? 1 : contentType === "rationales" ? 0 : 0.7} />;
  }

  // Search-specific empty states
  if (searchQuery && searchQuery.trim().length >= 2) {
    if (searchQuery.trim().length < 2) {
      return (
        <div className="flex flex-col flex-grow items-center justify-center p-6">
          <span className="text-muted-foreground">Enter at least 2 characters to search</span>
        </div>
      );
    }

    if (filteredContent.length === 0) {
      return (
        <div className="flex flex-col flex-grow items-center justify-center p-6">
          <span className="text-muted-foreground">No results found for &ldquo;{searchQuery}&rdquo;</span>
        </div>
      );
    }
  }

  // Empty state for no content
  if (filteredContent.length === 0 && !searchQuery) {
    const hasActiveFilters = selectedPointIds.length > 0 || topicFilters.length > 0;

    return (
      <div className="flex flex-col flex-grow items-center justify-center gap-4 py-12 text-center min-h-[50vh]">
        <span className="text-muted-foreground">
          {hasActiveFilters ? "No content matches your filters" : "Nothing here yet"}
        </span>
        {onRefetchFeed && (
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={onRefetchFeed}
              disabled={isRefetching}
              className="rounded-full flex items-center gap-2 px-6"
            >
              <RefreshCwIcon className={`size-4 ${isRefetching ? 'animate-spin' : ''}`} />
              <span>{isRefetching ? 'Refreshing...' : 'Refresh Feed'}</span>
            </Button>
          </div>
        )}
      </div>
    );
  }

  const hasActiveFilters = selectedPointIds.length > 0 || topicFilters.length > 0;

  return (
    <div className="flex flex-col flex-grow w-full">
      {/* Rationale-specific components - show at top of rationales tab when not searching/filtering */}
      {contentType === "rationales" && !searchQuery && !hasActiveFilters && (
        <div className="mx-auto w-full max-w-5xl px-3">
          <RationalesConcernsSection spaceId={space} />
        </div>
      )}

      {/* Show active filters indicator */}
      {hasActiveFilters && (
        <div className="px-4 py-3 bg-muted/30 border-b">
          <div className="text-sm text-muted-foreground">
            {selectedPointIds.length > 0 && (
              <span>
                Filtering by {selectedPointIds.length} point{selectedPointIds.length !== 1 ? 's' : ''}
                {matchType === "all" ? " (all must match)" : " (any can match)"}
              </span>
            )}
            {selectedPointIds.length > 0 && topicFilters.length > 0 && <span> · </span>}
            {topicFilters.length > 0 && (
              <span>
                {topicFilters.length} topic{topicFilters.length !== 1 ? 's' : ''} selected
              </span>
            )}
          </div>
        </div>
      )}

      {visibleItems.map((item) => (
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

      {visibleCount < filteredContent.length && (
        <div ref={sentinelRef}>
          <InfiniteScrollSkeleton
            type={contentType === "points" ? "points" : contentType === "rationales" ? "viewpoints" : "mixed"}
            count={3}
          />
        </div>
      )}
    </div>
  );
});

UnifiedContentList.displayName = 'UnifiedContentList';