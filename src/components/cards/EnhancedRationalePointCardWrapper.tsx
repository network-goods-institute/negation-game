import React from 'react';
import { useOriginalPoster } from "@/components/contexts/OriginalPosterContext";
import { useFavorHistory } from '@/queries/epistemic/useFavorHistory';
import { useAtom, useSetAtom } from "jotai";
import { negatedPointIdAtom } from "@/atoms/negatedPointIdAtom";
import { hoveredPointIdAtom } from "@/atoms/hoveredPointIdAtom";
import { PointCard } from "@/components/cards/PointCard";
import { OPBadge } from "@/components/cards/pointcard/OPBadge";
import { cn } from "@/lib/utils/cn";
import useFocusNode from "@/hooks/graph/useFocusNode";
import type { ParallelRationalePointData } from '@/hooks/points/useParallelRationaleData';
import { EnhancedPointCardSkeleton } from '@/components/cards/pointcard/EnhancedPointCardSkeleton';

export interface EnhancedRationalePointCardWrapperProps {
    point: { pointId: number; parentId?: number | string };
    pointData: ParallelRationalePointData;
    className?: string;
    isSharing?: boolean;
}


const EnhancedRationalePointCardWrapper: React.FC<EnhancedRationalePointCardWrapperProps> = ({
    point,
    pointData,
    className,
    isSharing = false,
}) => {
    const { originalPosterId } = useOriginalPoster();
    const setNegatedPointId = useSetAtom(negatedPointIdAtom);
    const [hoveredPointId] = useAtom(hoveredPointIdAtom);
    const focusNode = useFocusNode();

    const opCred = pointData.opCred;
    const endorsedByOp = Boolean(opCred && opCred > 0);

    const { data: favorHistory } = useFavorHistory({
        pointId: point.pointId,
        timelineScale: "1W",
    });

    const handleClick = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if ((e.metaKey || e.ctrlKey) && point.pointId != null) {
            e.preventDefault();
            e.stopPropagation();
            focusNode(point.pointId);
        }
    }, [focusNode, point.pointId]);

    if (!pointData) {
        return (
            <EnhancedPointCardSkeleton
                className={className}
                showBadge={!!originalPosterId}
                showObjectionHeader={false}
                badgeVariant="loading"
            />
        );
    }

    return (
        <div className="relative">
            <PointCard
                onClick={handleClick}
                className={cn(
                    className,
                    hoveredPointId === point.pointId && "border-4 border-blue-500 dark:border-blue-400"
                )}
                pointId={point.pointId}
                content={pointData.content}
                createdAt={pointData.createdAt}
                cred={pointData.cred}
                favor={pointData.favor}
                amountSupporters={pointData.amountSupporters}
                amountNegations={pointData.amountNegations}
                viewerContext={{
                    viewerCred: pointData.viewerCred,
                    viewerNegationsCred: pointData.viewerNegationsCred ?? 0
                }}
                originalPosterId={originalPosterId}
                onNegate={() => setNegatedPointId(point.pointId)}
                inRationale={true}
                favorHistory={favorHistory}
                isSharing={isSharing}
                isObjection={pointData.isObjection}
                objectionTargetId={pointData.objectionTargetId}
                isEdited={pointData.isEdited ?? false}
                editedAt={pointData.editedAt ?? undefined}
                editedBy={pointData.editedBy ?? undefined}
                editCount={pointData.editCount ?? 0}
                opCred={opCred}
            />

            {endorsedByOp && (
                <OPBadge
                    opCred={opCred ?? undefined}
                    originalPosterId={originalPosterId}
                />
            )}
        </div>
    );
};

export default EnhancedRationalePointCardWrapper;