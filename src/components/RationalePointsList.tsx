import React from 'react';
import { Dynamic } from '@/components/utils/Dynamic';
import RationalePointCardWrapper from '@/components/RationalePointCardWrapper';
import { cn } from '@/lib/cn';

export interface RationalePointsListProps {
    points: { pointId: number; parentId?: number | string; initialPointData?: import('@/queries/usePointData').PointData }[];
    hoveredPointId?: number | null;
    selectedPointIds?: Set<number>;
    editMode?: boolean;
    isSharing?: boolean;
    containerClassName?: string;
    headingClassName?: string;
}

/**
 * Shared list of point cards with consistent styling and behavior.
 */
export default function RationalePointsList({
    points,
    hoveredPointId,
    selectedPointIds = new Set(),
    editMode = false,
    isSharing = false,
    containerClassName = 'flex flex-col w-full',
    headingClassName = 'text-muted-foreground text-xs uppercase font-semibold tracking-widest w-full p-2 border-y text-center',
}: RationalePointsListProps) {
    return (
        <div className={containerClassName}>
            <span className={headingClassName}>Points</span>
            <Dynamic>
                {points.map((point, idx) => (
                    <div
                        key={`point-card-${point.pointId}-${idx}`}
                        id={`point-card-${point.pointId}`}
                        className="relative"
                    >
                        <RationalePointCardWrapper
                            point={point}
                            initialPointData={point.initialPointData}
                            className={cn(
                                'border-b',
                                hoveredPointId === point.pointId && 'shadow-[inset_0_0_0_2px_hsl(var(--primary))]',
                                editMode && 'pr-10',
                                isSharing && selectedPointIds.has(point.pointId) && 'bg-primary/10'
                            )}
                            isSharing={isSharing}
                        />
                    </div>
                ))}
            </Dynamic>
        </div>
    );
} 