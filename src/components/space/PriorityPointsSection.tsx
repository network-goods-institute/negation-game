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
        <div className="border-b bg-gradient-to-r from-amber-50/30 via-orange-50/20 to-amber-50/30 dark:from-amber-950/20 dark:via-orange-950/10 dark:to-amber-950/20">
            <div className="px-6 py-4 border-b border-amber-200/50 dark:border-amber-800/30">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full animate-pulse"></div>
                        <h2 className="text-lg font-bold text-amber-800 dark:text-amber-200">Priority Points</h2>
                    </div>
                    <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                        {filteredPriorityPoints.length} relevant {filteredPriorityPoints.length === 1 ? 'point' : 'points'}
                    </span>
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Points you&apos;ve endorsed that have changed significantly
                </p>
            </div>
            <div className="divide-y divide-amber-200/30 dark:divide-amber-800/20">
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
        </div>
    );
});

PriorityPointsSection.displayName = 'PriorityPointsSection'; 