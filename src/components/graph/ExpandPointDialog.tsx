import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PointStats } from "@/components/PointStats";
import {
    CircleIcon,
    ExternalLinkIcon,
    ArrowLeftIcon,
    CheckIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { encodeId } from "@/lib/encodeId";
import { usePointData } from "@/queries/usePointData";
import { useState } from "react";
import { nanoid } from "nanoid";
import { useReactFlow } from "@xyflow/react";

export interface ExpandablePoint {
    pointId: number;
    parentId?: string | number;
}

interface ExpandablePointCardProps {
    point: ExpandablePoint;
    isSelected: boolean;
    onSelect: (point: ExpandablePoint) => void;
}

const ExpandablePointCard: React.FC<ExpandablePointCardProps> = ({
    point,
    isSelected,
    onSelect,
}) => {
    const { data: pointData } = usePointData(point.pointId);

    if (!pointData) {
        return (
            <div className="h-24 w-full bg-muted animate-pulse rounded-md" />
        );
    }

    return (
        <div
            className={cn(
                "flex flex-col gap-3 p-4 w-full bg-background cursor-pointer border rounded-md transition-colors shadow-sm hover:border-primary hover:ring-1 hover:ring-primary relative",
                isSelected && "border-primary ring-1 ring-primary bg-primary/5"
            )}
            onClick={() => onSelect(point)}
        >
            <div className="flex flex-col gap-1">
                <span className="text-md font-medium">
                    {pointData.content}
                </span>

                <div className="flex justify-end mb-1">
                    <div className="flex items-center gap-2">
                        <Badge
                            className={cn(
                                "bg-primary/15 text-primary border-primary hover:bg-primary/20 whitespace-nowrap"
                            )}
                        >
                            Existing
                        </Badge>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 p-0 rounded-full"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(getPointUrl(point.pointId), '_blank', 'noopener,noreferrer');
                                    }}
                                >
                                    <ExternalLinkIcon className="h-3.5 w-3.5" />
                                    <span className="sr-only">Open in new tab</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                <p>Open in new tab</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>

                <PointStats
                    favor={pointData.favor}
                    amountNegations={pointData.amountNegations}
                    amountSupporters={pointData.amountSupporters}
                    cred={pointData.cred}
                />
            </div>
        </div>
    );
};

interface ExpandPointDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    points: ExpandablePoint[];
    onSelectPoint: (point: ExpandablePoint) => void;
    onClose: () => void;
    parentNodeId: string;
}

const getPointUrl = (pointId: number) => `${encodeId(pointId)}`;

function calculateInitialLayout(
    parentX: number,
    parentY: number,
    parentHeight: number,
    count: number,
    spacing = 250,
    verticalOffset = 200
): Array<{ x: number; y: number }> {
    if (count === 0) return [];

    if (count === 1) {
        return [{ x: parentX, y: parentY + parentHeight + verticalOffset }];
    }

    const positions: Array<{ x: number; y: number }> = [];


    const totalWidth = (count - 1) * spacing;
    const startX = parentX - totalWidth / 2;

    const dynamicVerticalOffset = verticalOffset + (count > 2 ? (count - 2) * 50 : 0);

    for (let i = 0; i < count; i++) {
        const progress = count > 1 ? i / (count - 1) : 0;
        const x = startX + (progress * totalWidth);

        const arcHeight = 80 * Math.sin(Math.PI * progress);
        const horizontalVariation = (progress - 0.5) * 120;

        const y = parentY + parentHeight + dynamicVerticalOffset + arcHeight;
        const adjustedX = x + horizontalVariation;

        positions.push({ x: adjustedX, y });
    }

    return positions;
}

export const ExpandPointDialog: React.FC<ExpandPointDialogProps> = ({
    open,
    onOpenChange,
    points,
    onClose,
    parentNodeId,
}) => {
    const [selectedPoints, setSelectedPoints] = useState<Set<number>>(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { getNode, addNodes, addEdges } = useReactFlow();

    const handlePointToggle = (point: ExpandablePoint) => {
        setSelectedPoints(prev => {
            const newSet = new Set(prev);
            if (newSet.has(point.pointId)) {
                // eslint-disable-next-line drizzle/enforce-delete-with-where
                newSet.delete(point.pointId);
            } else {
                newSet.add(point.pointId);
            }
            return newSet;
        });
    };

    const handleSubmit = () => {
        setIsSubmitting(true);
        try {
            const parentNode = getNode(parentNodeId);
            if (!parentNode) return;

            const selectedPointsList = points.filter(point =>
                selectedPoints.has(point.pointId)
            );

            const layouts = calculateInitialLayout(
                parentNode.position.x,
                parentNode.position.y,
                parentNode?.measured?.height ?? 200,
                selectedPointsList.length
            );

            selectedPointsList.forEach((point, index) => {
                const uniqueId = `${nanoid()}-${Date.now()}-${index}`;
                const position = layouts[index];

                addNodes({
                    id: uniqueId,
                    data: {
                        pointId: point.pointId,
                        parentId: parentNode.data.pointId,
                        _lastModified: Date.now(),
                        isExpanding: true
                    },
                    type: "point",
                    position,
                });

                addEdges({
                    id: nanoid(),
                    target: parentNodeId,
                    source: uniqueId,
                    type: parentNode.data.parentId === 'statement' ? 'statement' : 'negation',
                });
            });

            setSelectedPoints(new Set());
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-center">
                        Add Points to Rationale
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col h-full max-h-[80vh] overflow-hidden">
                    <div className="flex-grow overflow-y-auto pb-20">
                        <div className="p-6">
                            <div className="mb-8">
                                <div className="flex items-center gap-2 mb-3">
                                    <CircleIcon className="text-primary size-5" />
                                    <h4 className="text-md font-medium">Select Points to Add</h4>
                                </div>
                                <p className="text-sm text-muted-foreground mb-3">
                                    Select multiple points to add to your rationale. Each point will be added with its own layout position.
                                </p>
                                <div className="space-y-3">
                                    {points.map((point) => (
                                        <ExpandablePointCard
                                            key={point.pointId}
                                            point={point}
                                            isSelected={selectedPoints.has(point.pointId)}
                                            onSelect={handlePointToggle}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="sm:justify-between gap-2 border-t bg-background/80 backdrop-blur sticky bottom-0 p-4">
                        <Button
                            variant="outline"
                            className="gap-2"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            <ArrowLeftIcon className="size-4" />
                            Back
                        </Button>
                        <Button
                            className="gap-2 min-w-[180px] relative"
                            onClick={handleSubmit}
                            disabled={selectedPoints.size === 0 || isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="opacity-0">Add Selected Points</span>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="size-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <CheckIcon className="size-4" />
                                    Add Selected Points
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ExpandPointDialog; 