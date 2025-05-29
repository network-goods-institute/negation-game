"use client";

import React, { memo, useEffect } from "react";
import Link from "next/link";
import { encodeId } from "@/lib/negation-game/encodeId";
import { preventDefaultIfContainsSelection } from "@/lib/utils/preventDefaultIfContainsSelection";
import { usePrefetchPoint } from "@/queries/points/usePointData";
import { usePrefetchFavorHistory } from "@/hooks/data/usePrefetchFavorHistory";
import { PointCard } from "@/components/cards/PointCard";

export interface PinnedPointWithHistoryProps {
    pinnedPoint: any;
    space: string;
    loadingCardId: string | null;
    basePath: string;
    handleCardClick: (id: string) => void;
    handleNavigate: (e: React.MouseEvent<HTMLAnchorElement>, encodedId: string) => void;
}

export const PinnedPointWithHistory = memo(({
    pinnedPoint,
    space,
    loadingCardId,
    basePath,
    handleCardClick,
    handleNavigate
}: PinnedPointWithHistoryProps) => {
    const prefetchPoint = usePrefetchPoint();
    const loadHistory = usePrefetchFavorHistory(pinnedPoint.pointId, prefetchPoint);
    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    const encoded = encodeId(pinnedPoint.pointId);

    return (
        <Link
            draggable={false}
            href={`${basePath}/${encoded}`}
            className="flex cursor-pointer hover:bg-accent"
            onClick={(e) => {
                preventDefaultIfContainsSelection(e);
                const isActionButton = (e.target as HTMLElement).closest(
                    '[data-action-button="true"]'
                );
                if (!isActionButton && window.getSelection()?.isCollapsed !== false) {
                    handleCardClick(`point-${pinnedPoint.pointId}`);
                    handleNavigate(e, encoded);
                }
            }}
            onMouseEnter={() => prefetchPoint(pinnedPoint.pointId)}
        >
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
                        : "Pinned by command"
                }
                linkDisabled={true}
                isLoading={loadingCardId === `point-${pinnedPoint.pointId}`}
            />
        </Link>
    );
});

PinnedPointWithHistory.displayName = 'PinnedPointWithHistory'; 