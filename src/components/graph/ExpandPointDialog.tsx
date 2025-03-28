import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PointStats } from "@/components/PointStats";
import {
    ExternalLinkIcon,
    XIcon,
    CheckIcon,
    SearchIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePointData } from "@/queries/usePointData";
import { useState, useEffect, useRef, useMemo } from "react";
import { nanoid } from "nanoid";
import { useReactFlow } from "@xyflow/react";
import { getPointUrl } from "@/lib/getPointUrl";
import { Portal } from "@radix-ui/react-portal";
import { atom, useAtom } from "jotai";

export interface ExpandablePoint {
    pointId: number;
    parentId?: string | number;
}

interface ExpandablePointNodeProps {
    point: ExpandablePoint;
    isSelected: boolean;
    isExpanded: boolean;
    isCollapsed: boolean;
    onSelect: (point: ExpandablePoint) => void;
    searchTerm: string;
}

const ExpandablePointNode: React.FC<ExpandablePointNodeProps> = ({
    point,
    isSelected,
    isExpanded,
    isCollapsed,
    onSelect,
    searchTerm
}) => {
    const { data: pointData, isLoading } = usePointData(point.pointId);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        if (!searchTerm.trim() || !pointData) {
            setIsVisible(true);
            return;
        }

        try {
            const matches = pointData.content.toLowerCase().includes(searchTerm.toLowerCase());
            setIsVisible(matches);
        } catch (e) {
            console.error(`Error filtering point ${point.pointId}:`, e);
            setIsVisible(false);
        }
    }, [searchTerm, pointData, point.pointId]);

    if (!pointData || isLoading) {
        return (
            <div className="h-24 w-full bg-muted animate-pulse rounded-md" />
        );
    }

    // Hide non-matching items
    if (!isVisible) {
        return null;
    }

    return (
        <div
            className={cn(
                "flex flex-col bg-background border-2 rounded-md transition-colors shadow-sm relative min-h-28",
                isSelected && "border-primary ring-2 ring-primary/30",
                isExpanded ?
                    "bg-primary/10 border-primary cursor-not-allowed" :
                    "cursor-pointer hover:border-primary hover:bg-muted/20"
            )}
            onClick={() => {
                if (isExpanded) return; // Cannot select already expanded points
                onSelect(point);
            }}
            title={`Point ID: ${point.pointId} | Status: ${isExpanded ? 'Expanded' : 'Collapsed'}`}
        >
            <div className="p-3 flex flex-col gap-1.5">
                <span className="text-sm font-medium line-clamp-3">
                    {pointData.content}
                </span>

                <div className="flex justify-between items-center mt-1">
                    <PointStats
                        favor={pointData.favor}
                        amountNegations={pointData.amountNegations}
                        amountSupporters={pointData.amountSupporters}
                        cred={pointData.cred}
                    />

                    <div className="flex items-center gap-2">
                        {isExpanded ? (
                            <Badge className="bg-primary/20 text-primary border-primary font-semibold whitespace-nowrap">
                                Expanded
                            </Badge>
                        ) : (
                            <Badge className="bg-muted-foreground/10 text-muted-foreground border-muted-foreground whitespace-nowrap">
                                Collapsed
                            </Badge>
                        )}
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

type ExpandDialogState = {
    isOpen: boolean;
    points: ExpandablePoint[];
    parentNodeId: string;
    onClose: (() => void) | null;
    onSelectPoint: ((point: ExpandablePoint) => void) | null;
};

export const expandDialogAtom = atom<ExpandDialogState>({
    isOpen: false,
    points: [],
    parentNodeId: '',
    onClose: null,
    onSelectPoint: null
});

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

// Main component that manages global dialog state
export const ExpandPointDialog: React.FC<ExpandPointDialogProps> = ({
    open,
    points,
    onClose,
    parentNodeId,
    onSelectPoint
}) => {
    // Update global state when this component's props change
    const [dialogState, setDialogState] = useAtom(expandDialogAtom);

    useEffect(() => {
        if (open) {
            setDialogState({
                isOpen: true,
                points,
                parentNodeId,
                onClose,
                onSelectPoint
            });
        }
    }, [open, points, parentNodeId, onClose, onSelectPoint, setDialogState]);

    // Empty render since the actual dialog is rendered by GlobalExpandPointDialog
    return null;
};

export const GlobalExpandPointDialog: React.FC = () => {
    const [dialogState, setDialogState] = useAtom(expandDialogAtom);
    const [selectedPoints, setSelectedPoints] = useState<Set<number>>(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [modalSize, setModalSize] = useState({ width: 450, height: 550 });
    const modalRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const { getNode, addNodes, addEdges, getNodes, getEdges } = useReactFlow();

    const expandedPointIds = useMemo(() => {
        if (!dialogState.isOpen) return new Set<number>();


        const nodes = getNodes();
        const connectedToParent = new Set<number>();

        const edges = getEdges();
        const parentNode = getNode(dialogState.parentNodeId);

        if (parentNode) {
            const incomingEdges = edges.filter(e => e.target === dialogState.parentNodeId);

            incomingEdges.forEach(edge => {
                const sourceNode = nodes.find(n => n.id === edge.source);
                if (sourceNode?.type === 'point' && sourceNode?.data?.pointId) {
                    connectedToParent.add(sourceNode.data.pointId as number);
                }
            });
        }

        return connectedToParent;
    }, [dialogState.isOpen, dialogState.parentNodeId, getNodes, getEdges, getNode]);

    useEffect(() => {
        if (dialogState.isOpen) {
            // Always position in bottom right of viewport
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            // Add padding from edges
            const rightPadding = 20;
            const bottomPadding = 20;

            // Ensure the dialog fits within the viewport
            const xPos = viewportWidth - modalSize.width - rightPadding;
            const yPos = viewportHeight - modalSize.height - bottomPadding;

            setPosition({
                x: Math.max(20, xPos),
                y: Math.max(20, yPos)
            });
        }
    }, [dialogState.isOpen, modalSize]);

    // Update modal size when content changes
    useEffect(() => {
        if (modalRef.current) {
            const newWidth = Math.min(480, window.innerWidth - 40);
            setModalSize(prev => ({ ...prev, width: newWidth }));
        }
    }, [dialogState.isOpen]);

    // Reset selected points when search term changes to avoid selecting hidden points
    useEffect(() => {
        if (searchTerm.trim() !== '') {
            setSelectedPoints(new Set());
        }
    }, [searchTerm]);

    // Reset state when dialog opens or parent changes
    useEffect(() => {
        if (dialogState.isOpen) {
            setSearchTerm('');
            setSelectedPoints(new Set());
        }
    }, [dialogState.isOpen, dialogState.parentNodeId]);

    const handleClose = () => {
        if (dialogState.onClose) {
            dialogState.onClose();
        }
        setDialogState(state => ({ ...state, isOpen: false }));
        setSearchTerm('');
        setSelectedPoints(new Set());
    };

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
            const parentNode = getNode(dialogState.parentNodeId);
            if (!parentNode) return;

            // Filter out points that are already connected to this parent
            const selectedPointsList = dialogState.points
                .filter(point => selectedPoints.has(point.pointId))
                .filter(point => !expandedPointIds.has(point.pointId));

            if (selectedPointsList.length === 0) {
                // If all selected points are already added, just close the dialog
                handleClose();
                return;
            }

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
                    target: dialogState.parentNodeId,
                    source: uniqueId,
                    type: parentNode.data.parentId === 'statement' ? 'statement' : 'negation',
                });
            });

            setSelectedPoints(new Set());
            handleClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        // Only initiate drag if clicking on the header area
        if ((e.target as HTMLElement).closest('.modal-header')) {
            // Don't initiate drag if clicking on a button in the header
            if (!(e.target as HTMLElement).closest('button')) {
                isDragging.current = true;
                dragStart.current = {
                    x: e.clientX - position.x,
                    y: e.clientY - position.y
                };
                e.preventDefault();
            }
        }
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (isDragging.current) {
            const newX = e.clientX - dragStart.current.x;
            const newY = e.clientY - dragStart.current.y;

            // Keep the modal within viewport bounds
            const maxX = window.innerWidth - (modalRef.current?.offsetWidth || 400);
            const maxY = window.innerHeight - (modalRef.current?.offsetHeight || 500);

            setPosition({
                x: Math.max(0, Math.min(newX, maxX)),
                y: Math.max(0, Math.min(newY, maxY))
            });
        }
    };

    const handleMouseUp = () => {
        isDragging.current = false;
    };

    useEffect(() => {
        if (dialogState.isOpen) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [dialogState.isOpen]);

    if (!dialogState.isOpen) return null;

    return (
        <Portal>
            <div
                ref={modalRef}
                className="fixed z-50 bg-background rounded-lg border-2 shadow-lg overflow-hidden flex flex-col"
                style={{
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    width: `${modalSize.width}px`,
                    maxHeight: `${modalSize.height}px`,
                }}
                onMouseDown={handleMouseDown}
            >
                {/* Modal Header - Draggable */}
                <div className="modal-header flex justify-between items-center px-4 py-3 border-b bg-background cursor-move">
                    <h3 className="text-sm font-medium">Add Points to Rationale</h3>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleClose}
                    >
                        <XIcon className="h-4 w-4" />
                    </Button>
                </div>

                {/* Search Box */}
                <div className="px-3 py-3 border-b bg-muted/10">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search for points..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 h-9 focus-visible:ring-primary focus-visible:ring-offset-0"
                        />
                    </div>
                </div>

                {/* Points List */}
                <div className="flex-grow overflow-y-auto p-3 space-y-3">
                    {dialogState.points.length === 0 ? (
                        <div className="flex items-center justify-center h-32 text-muted-foreground">
                            No points available
                        </div>
                    ) : (
                        dialogState.points.map((point) => {
                            const isExpanded = expandedPointIds.has(point.pointId);
                            return (
                                <ExpandablePointNode
                                    key={point.pointId}
                                    point={point}
                                    isSelected={selectedPoints.has(point.pointId)}
                                    isExpanded={isExpanded}
                                    isCollapsed={!isExpanded}
                                    onSelect={handlePointToggle}
                                    searchTerm={searchTerm}
                                />
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="px-3 py-3.5 border-t bg-background">
                    <Button
                        className="w-full gap-2 relative h-9"
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
                                Add Selected Points ({selectedPoints.size})
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </Portal>
    );
};

export default ExpandPointDialog; 