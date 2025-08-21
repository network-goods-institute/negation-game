"use client";

import React, { memo } from "react";
import Link from "next/link";
import { encodeId } from "@/lib/negation-game/encodeId";
import { preventDefaultIfContainsSelection } from "@/lib/utils/preventDefaultIfContainsSelection";
import { usePrefetchFavorHistory } from "@/hooks/data/usePrefetchFavorHistory";
import { PointCard } from "@/components/cards/PointCard";

export interface PriorityPointItemProps {
    point: any;
    basePath: string;
    space: string;
    setNegatedPointId: (id: number) => void;
    login: () => void;
    user: any;
    loadingCardId: string | null;
    handleCardClick: (id: string) => void;
}

const MemoizedPointCard = memo(PointCard);

export const PriorityPointItem = memo(({
    point,
    basePath,
    space,
    setNegatedPointId,
    login,
    user,
    loadingCardId,
    handleCardClick
}: PriorityPointItemProps) => {
    const handlePrefetch = usePrefetchFavorHistory(point.pointId, () => { });

    let pinStatus: string | undefined;
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
                onClick={(e) => {
                    preventDefaultIfContainsSelection(e);
                    const isActionButton = (e.target as HTMLElement).closest('[data-action-button="true"]');
                    if (!isActionButton && window.getSelection()?.isCollapsed !== false) {
                        handleCardClick(`point-${point.pointId}`);
                    }
                }}
                href={`${basePath}/${encodeId(point.pointId)}`}
                className="flex border-b cursor-pointer hover:bg-accent transition-colors duration-150"
                onMouseEnter={handlePrefetch}
                prefetch={false as any}
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
                    disablePopover={false}
                    isLoading={loadingCardId === `point-${point.pointId}`}
                    isEdited={point.isEdited ?? false}
                    editedAt={point.editedAt}
                    editedBy={point.editedBy}
                    editCount={point.editCount ?? 0}
                />
            </Link>
        </div>
    );
});

PriorityPointItem.displayName = 'PriorityPointItem'; 