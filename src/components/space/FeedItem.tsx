"use client";

import React, { memo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePrefetchFavorHistory } from "@/hooks/data/usePrefetchFavorHistory";
import { preventDefaultIfContainsSelection } from "@/lib/utils/preventDefaultIfContainsSelection";
import { decodeId } from "@/lib/negation-game/decodeId";
import { encodeId } from "@/lib/negation-game/encodeId";
import { PointCard } from "@/components/cards/PointCard";
import { ViewpointCardWrapper } from "@/components/cards/ViewpointCardWrapper";

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
    onPrefetchPoint: (id: number) => void;
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
    loadingCardId,
    onPrefetchPoint
}: FeedItemProps) => {
    const pointId = item.type === 'point' ? item.data.pointId : null;
    const handleHover = usePrefetchFavorHistory(pointId, onPrefetchPoint);

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
            <Link
                draggable={false}
                onClick={(e) => {
                    preventDefaultIfContainsSelection(e);
                    const isActionButton = (e.target as HTMLElement)
                        .closest('[data-action-button="true"]');
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
                    viewerContext={{ viewerCred: point.viewerCred, viewerNegationsCred: point.viewerNegationsCred ?? 0 }}
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
                    isObjection={point.isObjection ?? false}
                    objectionTargetId={point.objectionTargetId ?? undefined}
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
            />
        );
    }

    return null;
});

FeedItem.displayName = 'FeedItem'; 