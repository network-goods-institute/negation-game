"use client";

import React, { memo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { usePrefetchFavorHistory } from "@/hooks/data/usePrefetchFavorHistory";
import { preventDefaultIfContainsSelection } from "@/lib/utils/preventDefaultIfContainsSelection";
import { decodeId } from "@/lib/negation-game/decodeId";
import { encodeId } from "@/lib/negation-game/encodeId";
import { PointCard } from "@/components/cards/PointCard";
import { ViewpointCardWrapper } from "@/components/cards/ViewpointCardWrapper";
import { pointQueryKey } from "@/queries/points/usePointData";

const MemoizedPointCard = memo(PointCard);
const MemoizedViewpointCardWrapper = memo(ViewpointCardWrapper);

export interface FeedItemProps {
    item: any;
    basePath: string;
    space: string;
    setNegatedPointId: (id: number) => void;
    login: () => void;
    user: any;
    pinnedPoint: any;
    handleCardClick: (id: string) => void;
    loadingCardId: string | null;
}

export const FeedItem = memo(({
    item,
    basePath,
    space,
    setNegatedPointId,
    login,
    user,
    pinnedPoint,
    handleCardClick,
    loadingCardId
}: FeedItemProps) => {
    const router = useRouter();
    const queryClient = useQueryClient();
    const pointId = item.type === 'point' ? item.data.pointId : null;
    const handleHover = usePrefetchFavorHistory(pointId, () => { });

    if (item.type === 'point') {
        const point = item.data;
        const viewerCred = typeof point.viewerCred === 'number' ? point.viewerCred : 0;
        const viewerNegationsCred = typeof point.viewerNegationsCred === 'number' ? point.viewerNegationsCred : 0;
        const isProposalToPin = point.content?.startsWith('/pin ');
        const isPinnedPoint = pinnedPoint && pinnedPoint.pointId === point.pointId;

        let targetPointId;
        if (isProposalToPin) {
            const parts = point.content.split(' ');
            if (parts.length > 1) {
                try {
                    targetPointId = decodeId(parts[1]);
                } catch {
                    const parsedId = parseInt(parts[1], 10);
                    if (!isNaN(parsedId)) {
                        targetPointId = parsedId;
                    }
                }
            }
        }

        let pinStatus;
        if (isProposalToPin) {
            pinStatus = targetPointId ?
                `Proposal to pin point ${targetPointId}` :
                "Proposal to pin";
        } else if (point.pinCommands?.length > 1) {
            pinStatus = `Proposal to pin (${point.pinCommands.length} proposals)`;
        } else if (point.pinCommands?.length === 1) {
            pinStatus = "Proposal to pin";
        }

        const pinnedCommandPointId = isProposalToPin
            ? undefined
            : point.pinCommands?.[0]?.id;

        return (
            <div
                className="flex border-b cursor-pointer hover:bg-accent transition-colors duration-150"
                onMouseEnter={handleHover}
                onClick={(e) => {
                    preventDefaultIfContainsSelection(e);
                    const isActionButton = (e.target as HTMLElement)
                        .closest('[data-action-button="true"]');
                    if (isActionButton || window.getSelection()?.isCollapsed === false) {
                        return;
                    }
                    // Seed caches and navigate immediately without waiting
                    queryClient.setQueryData(
                        pointQueryKey({ pointId: point.pointId, userId: user?.id }),
                        point
                    );
                    queryClient.setQueryData(
                        pointQueryKey({ pointId: point.pointId, userId: undefined }),
                        point
                    );
                    handleCardClick(`point-${point.pointId}`);
                    router.push(`${basePath}/${encodeId(point.pointId)}`);
                }}
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
                    viewerContext={{ viewerCred, viewerNegationsCred }}
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
                    disablePopover={false}
                    isLoading={loadingCardId === `point-${point.pointId}`}
                    isObjection={point.isObjection ?? false}
                    objectionTargetId={point.objectionTargetId ?? undefined}
                    isEdited={point.isEdited ?? false}
                    editedAt={point.editedAt}
                    editedBy={point.editedBy}
                    editCount={point.editCount ?? 0}
                />
            </div>
        );
    } else if (item.type === 'rationale') {
        const viewpoint = item.data;
        let pointIds: number[] = viewpoint.originalPointIds || [];

        if ((!pointIds || pointIds.length === 0) && viewpoint.graph?.nodes) {
            try {
                pointIds = viewpoint.graph.nodes
                    .filter((node: any) => node.type === 'point')
                    .map((node: any) => node.data?.pointId)
                    .filter((id: any) => typeof id === 'number');
            } catch {
                // ignore
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
                    averageFavor: viewpoint.statistics?.averageFavor || 0,
                }}
                loadingCardId={loadingCardId}
                handleCardClick={handleCardClick}
                topic={viewpoint.topic}
                topicId={viewpoint.topicId}
            />
        );
    }

    return null;
});

FeedItem.displayName = 'FeedItem'; 