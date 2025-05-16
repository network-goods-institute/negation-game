import { Button } from "@/components/ui/button";
import { PointStats } from "@/components/PointStats";
import {
    ExternalLinkIcon,
    XIcon,
    SearchIcon,
    PlusIcon,
    MinusIcon,
    CircleIcon
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePointData } from "@/queries/usePointData";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { nanoid } from "nanoid";
import { useReactFlow } from "@xyflow/react";
import { getPointUrl } from "@/lib/negation-game/getPointUrl";
import { Portal } from "@radix-ui/react-portal";
import { atom, useAtom } from "jotai";
import { hoveredPointIdAtom } from "@/atoms/hoveredPointIdAtom";
import { useVisitedPoints } from "@/hooks/useVisitedPoints";
import { usePrivy } from "@privy-io/react-auth";
import { visitedPointsAtom } from '@/atoms/visitedPointsAtom';

export interface ExpandablePoint {
    pointId: number;
    parentId?: string | number;
    searchTerm: string;
    isMobile?: boolean;
    dialogPosition: { x: number; y: number };
    isVisited: boolean;
    onMarkAsRead: (pointId: number) => void;
    onZoomToNode: (pointId: number) => void;
}

interface ExpandablePointNodeProps {
    point: ExpandablePoint;
    isSelected: boolean;
    isExpanded: boolean;
    onSelect: (point: ExpandablePoint) => void;
    onRemove?: (point: ExpandablePoint) => void;
    onDirectAdd?: (point: ExpandablePoint) => void;
    searchTerm: string;
    isMobile?: boolean;
    dialogPosition: { x: number; y: number };
    isVisited: boolean;
    onMarkAsRead: (pointId: number) => void;
    onZoomToNode: (pointId: number) => void;
}

const ExpandablePointNode: React.FC<ExpandablePointNodeProps> = ({
    point,
    isSelected,
    isExpanded,
    onSelect,
    onRemove,
    onDirectAdd,
    searchTerm,
    isMobile = false,
    isVisited,
    onMarkAsRead,
    onZoomToNode,
}) => {
    const { data: pointData, isLoading } = usePointData(point.pointId);
    const [isVisible, setIsVisible] = useState(true);
    const [isActive, setIsActive] = useState(false);
    const [hoveredPointId, setHoveredPointId] = useAtom(hoveredPointIdAtom);
    const { user: privyUser } = usePrivy();

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

    const handleMouseEnter = () => {
        setHoveredPointId(point.pointId);
    };

    const handleMouseLeave = () => {
        setHoveredPointId(undefined);
    };

    if (!pointData || isLoading) {
        return (
            <div className={cn(
                "w-full bg-muted animate-pulse rounded-md",
                isMobile ? "h-20" : "h-24"
            )} />
        );
    }

    if (!isVisible) {
        return null;
    }

    return (
        <div
            className={cn(
                "flex flex-col bg-background border-2 rounded-md transition-colors shadow-sm relative",
                isMobile ? "min-h-20" : "min-h-28",
                isSelected && !isExpanded && "border-purple-500 ring-2 ring-purple-500/30",
                !isSelected && !isExpanded && "border-muted-foreground/20",
                isExpanded && "border-gray-400/50 bg-gray-200/20 dark:bg-gray-800/20",
                isActive && "bg-yellow-500/5",
                hoveredPointId === point.pointId && "shadow-[inset_0_0_0_2px_yellow]",
                "cursor-pointer hover:bg-yellow-500/5 active:bg-yellow-500/10"
            )}
            onClick={() => {
                if (isExpanded) {
                    onZoomToNode(point.pointId);
                } else {
                    onSelect(point);
                }
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onTouchStart={() => setIsActive(true)}
            onTouchEnd={() => setIsActive(false)}
            onTouchCancel={() => setIsActive(false)}
            onMouseDown={() => setIsActive(true)}
            onMouseUp={() => setIsActive(false)}
            title={`Point ID: ${point.pointId}`}
        >
            <div className={cn(
                "flex flex-col",
                isMobile ? "p-2 gap-1" : "p-3 gap-1.5"
            )}>
                <span className={cn(
                    "font-medium line-clamp-3",
                    isMobile ? "text-xs" : "text-sm"
                )}>
                    {pointData.content}
                </span>

                <div className="flex justify-between items-center mt-1">
                    <PointStats
                        favor={pointData.favor}
                        amountNegations={pointData.amountNegations}
                        amountSupporters={pointData.amountSupporters}
                        cred={pointData.cred}
                        className={isMobile ? "scale-75 origin-left" : ""}
                    />

                    <div className="flex items-center gap-2">
                        {isExpanded ? (
                            <Button
                                variant="default"
                                size="sm"
                                className={cn(
                                    "rounded-full flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white",
                                    isMobile ? "h-6 px-1.5 py-0.5" : "h-7 px-2 py-1"
                                )}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onRemove) onRemove(point);
                                }}
                            >
                                <MinusIcon className={isMobile ? "size-2.5" : "size-3"} />
                                <span className={isMobile ? "text-[9px]" : "text-xs"}>Remove</span>
                            </Button>
                        ) : (
                            <Button
                                variant="default"
                                size="sm"
                                className={cn(
                                    "rounded-full flex items-center gap-1 bg-purple-500 hover:bg-purple-600",
                                    isMobile ? "h-6 px-1.5 py-0.5" : "h-7 px-2 py-1",
                                )}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onDirectAdd) {
                                        onDirectAdd(point);
                                    }
                                }}
                            >
                                <PlusIcon className={isMobile ? "size-2.5" : "size-3"} />
                                <span className={isMobile ? "text-[9px]" : "text-xs"}>Add</span>
                            </Button>
                        )}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "p-0 rounded-full",
                                        isMobile ? "h-5 w-5" : "h-6 w-6"
                                    )}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(getPointUrl(point.pointId), '_blank', 'noopener,noreferrer');
                                    }}
                                >
                                    <ExternalLinkIcon className={isMobile ? "h-3 w-3" : "h-3.5 w-3.5"} />
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
            {!isVisited && privyUser && (
                <div className="absolute top-0.5 right-1 group flex items-center gap-2">
                    <span className={cn(
                        "text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity",
                        isMobile ? "text-[8px]" : "text-xs"
                    )}>
                        Tap to mark seen
                    </span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onMarkAsRead(point.pointId);
                        }}
                        className={cn(
                            "relative rounded-full flex items-center justify-center",
                            isMobile ? "size-2" : "size-3"
                        )}
                        aria-label="Mark as seen"
                    >
                        <div className={cn(
                            "absolute inset-0 bg-endorsed/20 rounded-full scale-0 group-hover:scale-150 transition-transform",
                            isMobile ? "-m-1" : "-m-1.5"
                        )} />
                        <CircleIcon className="size-full fill-endorsed text-endorsed relative" />
                    </button>
                </div>
            )}
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
    const reactFlow = useReactFlow();
    const { getNode, addNodes, addEdges, getNodes, getEdges, deleteElements, getViewport } = reactFlow;
    const [manuallyRemovedPoints, setManuallyRemovedPoints] = useState<Set<number>>(new Set());
    const { markPointAsRead } = useVisitedPoints();
    const [visitedPoints] = useAtom(visitedPointsAtom);

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();

        window.addEventListener('resize', checkMobile);

        return () => {
            window.removeEventListener('resize', checkMobile);
        };
    }, []);

    const [forceUpdateCounter, setForceUpdateCounter] = useState(0);

    const nodesRaw = getNodes();
    const edgesRaw = getEdges();
    useEffect(() => {
        if (dialogState.isOpen) {
            setForceUpdateCounter(c => c + 1);
        }
    }, [nodesRaw.length, edgesRaw.length, dialogState.isOpen]);

    const needsRefresh = useRef(false);
    const queueRefresh = useCallback(() => {
        needsRefresh.current = true;
    }, []);

    const parentPointId = useMemo(() => {
        if (!dialogState.isOpen) return null;
        const parentNode = getNode(dialogState.parentNodeId);
        return parentNode?.data?.pointId || null;
    }, [dialogState.isOpen, dialogState.parentNodeId, getNode]);

    // Find the grandparent point ID (parent of the node being expanded)
    const grandparentPointId = useMemo(() => {
        if (!dialogState.isOpen || !parentPointId) return null;

        const parentNode = getNode(dialogState.parentNodeId);
        if (!parentNode?.data?.parentId) return null;

        const grandparentNode = getNodes().find(node => {
            return node.id === parentNode.data.parentId ||
                (typeof parentNode.data.parentId === 'number' &&
                    node.data.pointId === parentNode.data.parentId);
        });

        return grandparentNode?.data?.pointId || null;
    }, [dialogState.isOpen, dialogState.parentNodeId, parentPointId, getNode, getNodes]);

    // Determine which points are currently expanded (connected) to the parent
    const expandedPointIds = useMemo(() => {
        needsRefresh.current = false;

        if (!dialogState.isOpen) return new Set<number>();

        const connectedToParent = new Set<number>();
        const nodes = getNodes();
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
    }, [
        dialogState.isOpen,
        dialogState.parentNodeId,
        forceUpdateCounter,
        getNode
    ]);

    const [localExpandedPointIds, setLocalExpandedPointIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        setLocalExpandedPointIds(expandedPointIds);
    }, [expandedPointIds]);

    const effectiveExpandedPointIds = useMemo(() => {
        return localExpandedPointIds;
    }, [localExpandedPointIds]);

    const filterValidPoints = useCallback((point: ExpandablePoint) => {
        if (parentPointId && point.pointId === parentPointId) {
            return false;
        }
        return true;
    }, [parentPointId]);

    const filteredPoints = useMemo(() => {
        if (!dialogState.isOpen) {
            return [];
        }

        return dialogState.points.filter(filterValidPoints);
    }, [dialogState.isOpen, dialogState.points, filterValidPoints]);

    useEffect(() => {
        if (!dialogState.isOpen) return;

        if (isMobile) {
            // Mobile positioning: 
            const parentNode = getNode(dialogState.parentNodeId);

            // Get viewport information directly
            const { x: viewportX, y: viewportY, zoom } = getViewport();

            // Determine appropriate width for mobile
            const dialogWidth = Math.min(window.innerWidth - 20, 350);

            if (parentNode) {
                // Get parent node position, accounting for viewport transform
                const transformedX = parentNode.position.x * zoom + viewportX;
                const transformedY = parentNode.position.y * zoom + viewportY;
                const nodeHeight = parentNode?.measured?.height || 100;

                // Available space below and above the node
                const spaceBelow = window.innerHeight - transformedY - (nodeHeight * zoom) - 20;
                const spaceAbove = transformedY - 20;

                // Decide whether to place dialog above or below based on available space
                const placeBelow = spaceBelow >= 250 || spaceBelow > spaceAbove;

                // Center horizontally (with bounds checking)
                const centerX = transformedX + ((parentNode.width || 200) * zoom / 2) - (dialogWidth / 2);
                const dialogX = Math.max(10, Math.min(window.innerWidth - dialogWidth - 10, centerX));

                const dialogY = placeBelow
                    ? transformedY + (nodeHeight * zoom) + 10 // Below
                    : Math.max(10, transformedY - 10 - (placeBelow ? 0 : Math.min(400, spaceAbove))); // Above

                const availableHeight = placeBelow
                    ? window.innerHeight - dialogY - 10
                    : transformedY - dialogY - 10;

                setModalSize({
                    width: dialogWidth,
                    height: Math.min(400, window.innerHeight * 0.6)
                });

                setPosition({ x: dialogX, y: dialogY });
            } else {
                // Fallback for mobile if node not found - center dialog with safe margins
                setModalSize({
                    width: dialogWidth,
                    height: Math.min(400, window.innerHeight - 160)
                });
                setPosition({
                    x: (window.innerWidth - dialogWidth) / 2,
                    y: 80
                });
            }
        } else {
            // Desktop positioning: Bottom right
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            const dialogWidth = Math.min(480, window.innerWidth - 40);
            setModalSize(prev => ({ ...prev, width: dialogWidth }));

            const rightPadding = 20;
            const bottomPadding = 20;

            const xPos = viewportWidth - dialogWidth - rightPadding;
            const yPos = viewportHeight - modalSize.height - bottomPadding;

            setPosition({
                x: Math.max(20, xPos),
                y: Math.max(20, yPos)
            });
        }
    }, [dialogState.isOpen, isMobile, dialogState.parentNodeId, getNode, modalSize.height, getViewport]);

    useEffect(() => {
        if (dialogState.isOpen && effectiveExpandedPointIds.size > 0) {
            setSelectedPoints(prev => {
                const newSet = new Set(prev);
                let changed = false;

                for (const id of prev) {
                    if (effectiveExpandedPointIds.has(id)) {
                        // eslint-disable-next-line drizzle/enforce-delete-with-where
                        newSet.delete(id);
                        changed = true;
                    }
                }

                return changed ? newSet : prev;
            });
        }
    }, [dialogState.isOpen, effectiveExpandedPointIds]);

    useEffect(() => {
        if (modalRef.current) {
            const newWidth = Math.min(480, window.innerWidth - 40);
            setModalSize(prev => ({ ...prev, width: newWidth }));
        }
    }, [dialogState.isOpen]);

    const handleClose = () => {
        if (dialogState.onClose) {
            dialogState.onClose();
        }
        setDialogState(state => ({ ...state, isOpen: false }));
        setSearchTerm('');
        setSelectedPoints(new Set());
        setManuallyRemovedPoints(new Set());
    };

    const handleAddPoint = (point: ExpandablePoint) => {
        if (effectiveExpandedPointIds.has(point.pointId)) return;

        const parentNode = getNode(dialogState.parentNodeId);
        if (!parentNode) return;

        // First update our local state directly to ensure UI updates immediately
        setLocalExpandedPointIds(prev => {
            const newSet = new Set(prev);
            newSet.add(point.pointId);
            return newSet;
        });

        setManuallyRemovedPoints(prev => {
            if (prev.has(point.pointId)) {
                const newSet = new Set(prev);
                // eslint-disable-next-line drizzle/enforce-delete-with-where
                newSet.delete(point.pointId);
                return newSet;
            }
            return prev;
        });

        // Create a position for the single new node
        const layout = calculateInitialLayout(
            parentNode.position.x,
            parentNode.position.y,
            parentNode?.measured?.height ?? 200,
            1
        )[0];

        const uniqueId = `${nanoid()}-${Date.now()}`;

        // Add the node
        addNodes({
            id: uniqueId,
            data: {
                pointId: point.pointId,
                parentId: parentNode.data.pointId,
                _lastModified: Date.now(),
                isExpanding: true
            },
            type: "point",
            position: layout,
        });

        // Connect it to the parent
        addEdges({
            id: nanoid(),
            target: dialogState.parentNodeId,
            source: uniqueId,
            type: parentNode.data.parentId === 'statement' ? 'statement' : 'negation',
        });

        // Force a redraw without affecting selection
        setDialogState(prev => ({ ...prev }));
        setForceUpdateCounter(c => c + 1);
    };

    const handleRemovePoint = (point: ExpandablePoint) => {
        const nodes = getNodes();
        const edges = getEdges();

        const nodeToRemove = nodes.find(node => {
            const nodeData = node.data as Record<string, unknown>;
            return nodeData.pointId === point.pointId &&
                edges.some(edge => edge.source === node.id && edge.target === dialogState.parentNodeId);
        });

        if (nodeToRemove) {
            setLocalExpandedPointIds(prev => {
                const newSet = new Set(prev);
                // eslint-disable-next-line drizzle/enforce-delete-with-where
                newSet.delete(point.pointId);
                return newSet;
            });

            deleteElements({
                nodes: [nodeToRemove],
                edges: edges.filter(edge => edge.source === nodeToRemove.id)
            });

            setSelectedPoints(prev => {
                const newSet = new Set(prev);
                // eslint-disable-next-line drizzle/enforce-delete-with-where
                newSet.delete(point.pointId);
                return newSet;
            });

            setManuallyRemovedPoints(prev => {
                const newSet = new Set(prev);
                newSet.add(point.pointId);
                return newSet;
            });

            setForceUpdateCounter(c => c + 1);
        }
    };

    const handlePointToggle = (point: ExpandablePoint) => {
        if (effectiveExpandedPointIds.has(point.pointId)) return;

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

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('.modal-header')) {
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

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('.modal-header')) {
            if (!(e.target as HTMLElement).closest('button') && e.touches.length === 1) {
                isDragging.current = true;
                dragStart.current = {
                    x: e.touches[0].clientX - position.x,
                    y: e.touches[0].clientY - position.y
                };
            }
        }
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (isDragging.current) {
            const newX = e.clientX - dragStart.current.x;
            const newY = e.clientY - dragStart.current.y;

            const maxX = window.innerWidth - (modalRef.current?.offsetWidth || 400);
            const maxY = window.innerHeight - (modalRef.current?.offsetHeight || 500);

            setPosition({
                x: Math.max(0, Math.min(newX, maxX)),
                y: Math.max(0, Math.min(newY, maxY))
            });
        }
    };

    const handleTouchMove = (e: TouchEvent) => {
        if (isDragging.current && e.touches.length === 1) {
            const newX = e.touches[0].clientX - dragStart.current.x;
            const newY = e.touches[0].clientY - dragStart.current.y;

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

    const handleTouchEnd = () => {
        isDragging.current = false;
    };

    useEffect(() => {
        if (dialogState.isOpen) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('touchmove', handleTouchMove, { passive: true }); // Use passive for performance
            document.addEventListener('touchend', handleTouchEnd);

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.removeEventListener('touchmove', handleTouchMove);
                document.removeEventListener('touchend', handleTouchEnd);
            };
        }
    }, [dialogState.isOpen]);

    useEffect(() => {
        if (dialogState.isOpen) {
            setSearchTerm('');
        }
    }, [dialogState.isOpen]);

    useEffect(() => {
        if (dialogState.isOpen) {
            setSearchTerm('');

            // Set all points as selected by default except parent, grandparent, already expanded ones, and manually removed ones
            const initialSelected = new Set<number>();
            dialogState.points.forEach(point => {
                if (point.pointId !== parentPointId &&
                    point.pointId !== grandparentPointId &&
                    !effectiveExpandedPointIds.has(point.pointId) &&
                    !manuallyRemovedPoints.has(point.pointId)) {
                    initialSelected.add(point.pointId);
                }
            });
            setSelectedPoints(initialSelected);
        }
    }, [dialogState.isOpen, dialogState.points, dialogState.parentNodeId, parentPointId, grandparentPointId, effectiveExpandedPointIds, manuallyRemovedPoints]);

    const visiblePointsCount = useMemo(() => {
        if (!searchTerm.trim()) return filteredPoints.length;

        return filteredPoints.filter(point => {
            const node = getNodes().find(n =>
                n.type === 'point' &&
                n.data.pointId === point.pointId
            );

            if (!node?.data?.content) return false;
            return (node.data.content as string).toLowerCase().includes(searchTerm.toLowerCase());
        }).length;
    }, [filteredPoints, getNodes, searchTerm]);

    const [lastZoomedIndices, setLastZoomedIndices] = useState<Record<number, number>>({});

    const handleZoomToNode = useCallback((pointId: number) => {
        const nodes = reactFlow.getNodes();
        const matchingNodes = nodes.filter(node => node.type === 'point' && node.data?.pointId === pointId);

        if (matchingNodes.length === 0) return;

        const lastIndex = lastZoomedIndices[pointId] ?? -1;
        const nextIndex = (lastIndex + 1) % matchingNodes.length;
        setLastZoomedIndices(prev => ({ ...prev, [pointId]: nextIndex }));

        const targetNode = matchingNodes[nextIndex];

        reactFlow.fitView({
            nodes: [{ id: targetNode.id }],
            duration: 600,
            padding: 0.3,
            maxZoom: 1.2
        });
    }, [reactFlow, lastZoomedIndices]);

    if (!dialogState.isOpen) return null;

    return (
        <Portal>
            <div
                ref={modalRef}
                className={cn(
                    "fixed z-50 bg-background rounded-lg border-2 shadow-lg overflow-hidden flex flex-col",
                    isMobile && "border-primary"
                )}
                style={{
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    width: `${modalSize.width}px`,
                    maxHeight: `${modalSize.height}px`,
                }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
            >
                <div className={cn(
                    "modal-header flex justify-between items-center border-b bg-background cursor-move",
                    isMobile ? "px-2 py-2" : "px-4 py-3"
                )}>
                    <h3 className={cn(
                        "font-medium",
                        isMobile ? "text-xs" : "text-sm"
                    )}>
                        Add Points to Rationale
                    </h3>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={isMobile ? "h-6 w-6" : "h-7 w-7"}
                        onClick={handleClose}
                    >
                        <XIcon className={isMobile ? "h-3 w-3" : "h-4 w-4"} />
                    </Button>
                </div>

                <div className={cn(
                    "border-b bg-muted/10",
                    isMobile ? "px-2 py-2" : "px-3 py-3"
                )}>
                    <div className="relative flex items-center">
                        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search for points..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                            }}
                            className={cn(
                                "pl-9 pr-9 focus-visible:ring-primary focus-visible:ring-offset-0",
                                isMobile ? "h-7 text-xs" : "h-9"
                            )}
                        />
                        {searchTerm && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "absolute right-1 top-1/2 transform -translate-y-1/2",
                                    isMobile ? "h-5 w-5" : "h-7 w-7"
                                )}
                                onClick={() => setSearchTerm('')}
                            >
                                <XIcon className={isMobile ? "h-2 w-2" : "h-3 w-3"} />
                            </Button>
                        )}
                    </div>
                    <div className="flex justify-between mt-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                isMobile ? "h-6 text-[10px] px-2" : "h-7 text-xs"
                            )}
                            onClick={() => {
                                const newSelectedPoints = new Set<number>();
                                dialogState.points.forEach(point => {
                                    if (!effectiveExpandedPointIds.has(point.pointId)) {
                                        newSelectedPoints.add(point.pointId);
                                    }
                                });
                                setSelectedPoints(newSelectedPoints);
                            }}
                        >
                            Select All
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                isMobile ? "h-6 text-[10px] px-2" : "h-7 text-xs"
                            )}
                            onClick={() => {
                                setSelectedPoints(new Set());
                            }}
                        >
                            Unselect All
                        </Button>
                    </div>
                </div>

                <div className={cn(
                    "flex-grow overflow-y-auto space-y-3",
                    isMobile ? "p-2" : "p-3"
                )}>
                    {dialogState.points.length === 0 ? (
                        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                            No points available
                        </div>
                    ) : (
                        // Always map the points, ExpandablePointNode handles its own visibility
                        dialogState.points.map((point) => {
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
                                    dialogPosition={position}
                                    isVisited={visitedPoints.has(point.pointId)}
                                    onMarkAsRead={markPointAsRead}
                                    onZoomToNode={handleZoomToNode}
                                />
                            );
                        })
                    )}
                </div>

                <div className={cn(
                    "border-t bg-background",
                    isMobile ? "px-2 py-2" : "px-3 py-3.5"
                )}>
                    <Button
                        className={cn(
                            "w-full relative",
                            isMobile ? "h-8 text-sm" : "h-9"
                        )}
                        onClick={() => {
                            setIsSubmitting(true);
                            try {
                                const parentNode = getNode(dialogState.parentNodeId);
                                if (!parentNode) return;

                                const pointsToAdd = dialogState.points
                                    .filter(point => selectedPoints.has(point.pointId))
                                    .filter(point => !effectiveExpandedPointIds.has(point.pointId));

                                if (pointsToAdd.length === 0) {
                                    handleClose();
                                    return;
                                }

                                const layouts = calculateInitialLayout(
                                    parentNode.position.x,
                                    parentNode.position.y,
                                    parentNode?.measured?.height ?? 200,
                                    pointsToAdd.length
                                );

                                pointsToAdd.forEach((point, index) => {
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
                        }}
                        disabled={selectedPoints.size === 0 || isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <span className="opacity-0">Add</span>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="size-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                                </div>
                            </>
                        ) : (
                            selectedPoints.size > 0 ? `Add Selected (${selectedPoints.size})` : "Add Selected"
                        )}
                    </Button>
                </div>
            </div>
        </Portal>
    );
};

export default ExpandPointDialog; 