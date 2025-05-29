"use client";

import React, { memo } from "react";
import { PriorityPointItem } from "./PriorityPointItem";

export interface PriorityPointsSectionProps {
    filteredPriorityPoints: any[];
    basePath: string;
    space: string;
    setNegatedPointId: (id: number) => void;
    login: () => void;
    user: any;
    selectedTab: string;
    loadingCardId: string | null;
    handleCardClick: (id: string) => void;
    onPrefetchPoint: (id: number) => void;
}

export const PriorityPointsSection = memo(({
    filteredPriorityPoints,
    basePath,
    space,
    setNegatedPointId,
    login,
    user,
    selectedTab,
    loadingCardId,
    handleCardClick,
    onPrefetchPoint
}: PriorityPointsSectionProps) => {
    if (!filteredPriorityPoints || filteredPriorityPoints.length === 0) return null;

    return (
        <div className="border-b">
            {filteredPriorityPoints.map((point) => (
                <PriorityPointItem
                    key={`${selectedTab}-priority-${point.pointId}`}
                    point={point}
                    basePath={basePath}
                    space={space}
                    setNegatedPointId={setNegatedPointId}
                    login={login}
                    user={user}
                    loadingCardId={loadingCardId}
                    handleCardClick={handleCardClick}
                    onPrefetchPoint={onPrefetchPoint}
                />
            ))}
        </div>
    );
});

PriorityPointsSection.displayName = 'PriorityPointsSection'; 