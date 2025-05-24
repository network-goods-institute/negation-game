import { cn } from "@/lib/utils/cn";
import { ExpandablePointNode, ExpandablePoint } from "./ExpandablePointNode";

interface ExpandPointDialogListProps {
    isMobile: boolean;
    points: ExpandablePoint[];
    effectiveExpandedPointIds: Set<number>;
    selectedPoints: Set<number>;
    handlePointToggle: (point: ExpandablePoint) => void;
    handleRemovePoint: (point: ExpandablePoint) => void;
    handleAddPoint: (point: ExpandablePoint) => void;
    searchTerm: string;
    dialogPosition: { x: number; y: number };
    visitedPoints: Set<number>;
    markPointAsRead: (pointId: number) => void;
    handleZoomToNode: (pointId: number) => void;
}

export const ExpandPointDialogList: React.FC<ExpandPointDialogListProps> = ({
    isMobile,
    points,
    effectiveExpandedPointIds,
    selectedPoints,
    handlePointToggle,
    handleRemovePoint,
    handleAddPoint,
    searchTerm,
    visitedPoints,
    markPointAsRead,
    handleZoomToNode,
}) => {
    return (
        <div className={cn(
            "flex-grow overflow-y-auto space-y-3",
            isMobile ? "p-2" : "p-3"
        )}>
            {points.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                    No points available
                </div>
            ) : (
                points.map((point) => {
                    const isExpanded = effectiveExpandedPointIds.has(point.pointId);
                    return (
                        <ExpandablePointNode
                            key={point.pointId}
                            point={point}
                            isSelected={selectedPoints.has(point.pointId)}
                            isExpanded={isExpanded}
                            onSelect={handlePointToggle}
                            onRemove={handleRemovePoint}
                            onDirectAdd={handleAddPoint}
                            searchTerm={searchTerm}
                            isMobile={isMobile}
                            isVisited={visitedPoints.has(point.pointId)}
                            onMarkAsRead={markPointAsRead}
                            onZoomToNode={handleZoomToNode}
                        />
                    );
                })
            )}
        </div>
    );
}; 