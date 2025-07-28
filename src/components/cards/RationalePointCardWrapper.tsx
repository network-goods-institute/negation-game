import React from 'react';
import { usePointData, PointData } from '@/queries/points/usePointData';
import { useOriginalPoster } from "@/components/contexts/OriginalPosterContext";
import { useFavorHistory } from '@/queries/epistemic/useFavorHistory';
import { useAtom, useSetAtom } from "jotai";
import { negatedPointIdAtom } from "@/atoms/negatedPointIdAtom";
import { hoveredPointIdAtom } from "@/atoms/hoveredPointIdAtom";
import { PointCard } from "@/components/cards/PointCard";
import { cn } from "@/lib/utils/cn";
import useFocusNode from "@/hooks/graph/useFocusNode";

export interface RationalePointCardWrapperProps {
    point: { pointId: number; parentId?: number | string };
    initialPointData?: PointData;
    className?: string;
    isSharing?: boolean;
}

const RationalePointCardWrapper: React.FC<RationalePointCardWrapperProps> = ({
    point,
    initialPointData,
    className,
    isSharing = false,
}) => {
    const { data: fetchedData, isLoading: hookLoading } = usePointData(point.pointId);
    // Display server-hydrated data immediately; once client fetch finishes, switch to fetched data
    const pointData = hookLoading
        ? initialPointData
        : (fetchedData ?? initialPointData);
    // Only show loading state if there's no hydrated data and client fetch is ongoing
    const isLoading = initialPointData == null && hookLoading;
    const { originalPosterId } = useOriginalPoster();
    const setNegatedPointId = useSetAtom(negatedPointIdAtom);
    const [hoveredPointId] = useAtom(hoveredPointIdAtom);
    const focusNode = useFocusNode();

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

    if (isLoading || !pointData) {
        return <div className={cn("h-32 w-full bg-muted animate-pulse", className)} />;
    }

    return (
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
            viewerContext={{ viewerCred: pointData.viewerCred, viewerNegationsCred: pointData.viewerNegationsCred ?? 0 }}
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
        />
    );
};

export default RationalePointCardWrapper; 