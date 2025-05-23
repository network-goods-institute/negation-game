import React from 'react';
import { usePointData, PointData } from "@/queries/usePointData";
import { useOriginalPoster } from "@/components/graph/OriginalPosterContext";
import { useFavorHistory } from "@/queries/useFavorHistory";
import { useAtom, useSetAtom } from "jotai";
import { negatedPointIdAtom } from "@/atoms/negatedPointIdAtom";
import { hoveredPointIdAtom } from "@/atoms/hoveredPointIdAtom";
import { PointCard } from "@/components/PointCard";
import { cn } from "@/lib/cn";

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
    const { data: favorHistory } = useFavorHistory({
        pointId: point.pointId,
        timelineScale: "1W",
    });

    if (isLoading || !pointData) {
        return <div className={cn("h-32 w-full bg-muted animate-pulse", className)} />;
    }

    return (
        <PointCard
            className={cn(
                className,
                hoveredPointId === point.pointId && "shadow-[inset_0_0_0_2px_hsl(var(--primary))]"
            )}
            pointId={point.pointId}
            content={pointData.content}
            createdAt={pointData.createdAt}
            cred={pointData.cred}
            favor={pointData.favor}
            amountSupporters={pointData.amountSupporters}
            amountNegations={pointData.amountNegations}
            viewerContext={{ viewerCred: pointData.viewerCred ?? undefined }}
            originalPosterId={originalPosterId}
            onNegate={() => setNegatedPointId(point.pointId)}
            inRationale={true}
            favorHistory={favorHistory}
            isSharing={isSharing}
        />
    );
};

export default RationalePointCardWrapper; 