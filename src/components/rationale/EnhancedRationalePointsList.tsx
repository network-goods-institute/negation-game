import React from 'react';
import { Dynamic } from '../utils/Dynamic';
import EnhancedRationalePointCardWrapper from '../cards/EnhancedRationalePointCardWrapper';
import { cn } from '@/lib/utils/cn';
import { useParallelRationaleData } from '@/hooks/points/useParallelRationaleData';
import { EnhancedPointCardSkeleton } from '@/components/cards/pointcard/EnhancedPointCardSkeleton';
import { useOriginalPoster } from '@/components/contexts/OriginalPosterContext';
import { Loader } from '@/components/ui/loader';
import { useRationalePointsOptimization } from '@/hooks/rationale/useRationalePointsOptimization';

export interface EnhancedRationalePointsListProps {
    points: { pointId: number; parentId?: number | string; initialPointData?: any }[];
    hoveredPointId?: number | null;
    selectedPointIds?: Set<number>;
    editMode?: boolean;
    isSharing?: boolean;
    containerClassName?: string;
    headingClassName?: string;
}

export default function EnhancedRationalePointsList({
    points,
    hoveredPointId,
    selectedPointIds = new Set(),
    editMode = false,
    isSharing = false,
    containerClassName = 'flex flex-col w-full',
    headingClassName = 'text-muted-foreground text-xs uppercase font-semibold tracking-widest w-full p-2 border-y text-center',
}: EnhancedRationalePointsListProps) {
    const { originalPosterId } = useOriginalPoster();
    const pointIds = points.map(p => p.pointId);

    const {
        pointsData,
        isLoading,
        isError,
        isEndorsementsLoading,
        isUsersLoading
    } = useParallelRationaleData(pointIds, originalPosterId);

    useRationalePointsOptimization(pointsData, originalPosterId);

    const pointDataMap = React.useMemo(() => {
        const map = new Map();
        pointsData.forEach(data => {
            map.set(data.pointId, data);
        });
        return map;
    }, [pointsData]);

    if (isError) {
        return (
            <div className={containerClassName}>
                <span className={headingClassName}>Points</span>
                <div className="p-4 text-center text-red-500">
                    Failed to load points. Please refresh the page.
                </div>
            </div>
        );
    }

    return (
        <div className={containerClassName}>
            <span className={headingClassName}>
                Points {isLoading && <Loader className="inline size-3 ml-2" />}
            </span>

            <Dynamic>
                {points.map((point, idx) => {
                    const enhancedData = pointDataMap.get(point.pointId);

                    if (isLoading && !enhancedData && !point.initialPointData) {
                        return (
                            <EnhancedPointCardSkeleton
                                key={`point-skeleton-${point.pointId}-${idx}`}
                                className="border-b"
                                showBadge={!!originalPosterId}
                                showObjectionHeader={false}
                                badgeVariant="loading"
                            />
                        );
                    }

                    const displayData = enhancedData || point.initialPointData;

                    if (!displayData) {
                        return (
                            <EnhancedPointCardSkeleton
                                key={`point-loading-${point.pointId}-${idx}`}
                                className="border-b"
                                showBadge={!!originalPosterId}
                                showObjectionHeader={false}
                                badgeVariant="loading"
                            />
                        );
                    }

                    return (
                        <div
                            key={`point-card-${point.pointId}-${idx}`}
                            id={`point-card-${point.pointId}`}
                            className="relative"
                        >
                            <EnhancedRationalePointCardWrapper
                                point={point}
                                pointData={displayData}
                                className={cn(
                                    'border-b',
                                    hoveredPointId === point.pointId && 'border-4 border-blue-500 dark:border-blue-400',
                                    editMode && 'pr-10',
                                    isSharing && selectedPointIds.has(point.pointId) && 'bg-primary/10'
                                )}
                                isSharing={isSharing}
                            />
                        </div>
                    );
                })}
            </Dynamic>

            {!isLoading && (isEndorsementsLoading || isUsersLoading) && (
                <div className="text-center p-2 text-xs text-muted-foreground">
                    <Loader className="inline size-3 mr-2" />
                    {isEndorsementsLoading && isUsersLoading
                        ? "Loading badges and authors..."
                        : isEndorsementsLoading
                            ? "Loading gold badges..."
                            : "Loading authors..."}
                </div>
            )}
        </div>
    );
}