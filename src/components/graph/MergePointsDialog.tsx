import { Button } from "@/components/ui/button";
import { PointStats } from "@/components/PointStats";
import {
    ExternalLinkIcon,
    XIcon,
    CheckIcon,
    GitMergeIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { usePointData } from "@/queries/usePointData";
import { useState, useEffect, useRef, useMemo } from "react";
import { nanoid } from "nanoid";
import { useReactFlow } from "@xyflow/react";
import { getPointUrl } from "@/lib/getPointUrl";
import { Portal } from "@radix-ui/react-portal";
import { atom, useAtom } from "jotai";
import { Edge } from "@xyflow/react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface DuplicatePointNode {
    id: string;
    pointId: number;
    parentIds: (string | number)[];
}

type MergeDialogState = {
    isOpen: boolean;
    pointId: number;
    duplicateNodes: DuplicatePointNode[];
    onClose: (() => void) | null;
};

export const mergeDialogAtom = atom<MergeDialogState>({
    isOpen: false,
    pointId: 0,
    duplicateNodes: [],
    onClose: null
});

export const MergePointsDialog: React.FC = () => {
    const [dialogState, setDialogState] = useAtom(mergeDialogAtom);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [modalSize, setModalSize] = useState({ width: 450, height: 550 });
    const modalRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const { getNodes, getEdges, setEdges, setNodes } = useReactFlow();

    const { data: pointData } = usePointData(dialogState.pointId);

    const nodes = getNodes();
    const edges = getEdges();

    useEffect(() => {
        if (!dialogState.isOpen || !dialogState.pointId) return;

        const updatedDuplicateNodes = nodes
            .filter(node => node.type === 'point' && node.data?.pointId === dialogState.pointId)
            .map(node => {
                const nodeEdges = edges.filter(edge => edge.source === node.id);
                const parentIds = nodeEdges.map(edge => {
                    const parentNode = nodes.find(n => n.id === edge.target);
                    return parentNode?.data?.pointId || edge.target;
                }) as (string | number)[];

                return {
                    id: node.id,
                    pointId: dialogState.pointId,
                    parentIds
                };
            });

        if (updatedDuplicateNodes.length > 0 &&
            JSON.stringify(updatedDuplicateNodes) !== JSON.stringify(dialogState.duplicateNodes)) {
            setDialogState(prev => ({
                ...prev,
                duplicateNodes: updatedDuplicateNodes
            }));

            // Reset selection if nodes have changed
            setSelectedNodeIds(new Set());
        }
    }, [dialogState.isOpen, dialogState.pointId, nodes, edges, setDialogState, dialogState.duplicateNodes]);

    useEffect(() => {
        if (dialogState.isOpen) {
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            setPosition({
                x: Math.max(20, (viewportWidth - modalSize.width) / 2),
                y: Math.max(20, (viewportHeight - modalSize.height) / 2)
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

    useEffect(() => {
        if (dialogState.isOpen) {
            setSelectedNodeIds(new Set());
        } else {
            setHoveredNodeId(null);
        }
    }, [dialogState.isOpen]);

    // Handle node highlighting in the graph when hovering in the dialog
    useEffect(() => {
        if (!dialogState.isOpen) return;

        setNodes(nodes =>
            nodes.map(node => {
                if (node.id === hoveredNodeId) {
                    // Highlight the hovered node
                    return {
                        ...node,
                        className: node.className ? `${node.className} node-highlight` : 'node-highlight',
                        style: { ...node.style, boxShadow: '0 0 0 2px #FFBB00' }
                    };
                } else if (node.type === 'point' && node.data?.pointId === dialogState.pointId) {
                    // Remove highlight from other duplicate nodes
                    return {
                        ...node,
                        className: (node.className || '').replace('node-highlight', ''),
                        style: { ...node.style, boxShadow: undefined }
                    };
                }
                return node;
            })
        );

        return () => {
            // Cleanup on unmount: remove all highlights
            setNodes(nodes =>
                nodes.map(node => {
                    if (node.type === 'point' && node.data?.pointId === dialogState.pointId) {
                        return {
                            ...node,
                            className: (node.className || '').replace('node-highlight', ''),
                            style: { ...node.style, boxShadow: undefined }
                        };
                    }
                    return node;
                })
            );
        };
    }, [hoveredNodeId, dialogState.isOpen, dialogState.pointId, setNodes]);

    const handleClose = () => {
        if (dialogState.onClose) {
            dialogState.onClose();
        }
        setDialogState(state => ({ ...state, isOpen: false }));
        setSelectedNodeIds(new Set());
        // Clear hover state
        setHoveredNodeId(null);

        setNodes(nodes =>
            nodes.map(node => {
                if (node.type === 'point' && node.data?.pointId === dialogState.pointId) {
                    return {
                        ...node,
                        className: (node.className || '').replace('node-highlight', ''),
                        style: { ...node.style, boxShadow: undefined }
                    };
                }
                return node;
            })
        );
    };

    // Process parents info for easy display
    const processedNodes = useMemo(() => {
        if (!dialogState.duplicateNodes.length) return [];

        return dialogState.duplicateNodes.map(node => {
            const hasStatementParent = node.parentIds.some(id => id === 'statement');

            // Collect parent point IDs (excluding 'statement')
            const parentPoints = node.parentIds
                .filter(id => id !== 'statement' && typeof id === 'number')
                .map(id => Number(id));

            const parentInfos = parentPoints.map(id => {
                const parentNode = nodes.find(n =>
                    n.type === 'point' && n.data?.pointId === id
                );
                const content = typeof parentNode?.data?.content === 'string'
                    ? parentNode.data.content
                    : `Point ${id}`;

                return {
                    id,
                    content: content.length > 60 ? content.substring(0, 60) + '...' : content
                };
            });

            return {
                id: node.id,
                pointId: node.pointId,
                hasStatementParent,
                parentPoints: parentInfos
            };
        });
    }, [dialogState.duplicateNodes, nodes]);

    const handleSubmit = () => {
        if (selectedNodeIds.size < 2) return; // Need at least 2 nodes to merge

        setIsSubmitting(true);
        try {
            const currentNodes = getNodes();
            const currentEdges = getEdges();
            const newEdges: Edge[] = [...currentEdges];

            const selectedNodes = Array.from(selectedNodeIds);

            const nodeToKeep = selectedNodes[0];
            const nodesToMerge = selectedNodes.slice(1);

            nodesToMerge.forEach(nodeId => {

                currentEdges.forEach(edge => {
                    if (edge.source === nodeId) {
                        const newEdge = {
                            ...edge,
                            id: `${nanoid()}-${Date.now()}`,
                            source: nodeToKeep,
                        };
                        newEdges.push(newEdge);
                    }

                    if (edge.target === nodeId) {
                        const newEdge = {
                            ...edge,
                            id: `${nanoid()}-${Date.now()}`,
                            target: nodeToKeep,
                        };
                        newEdges.push(newEdge);
                    }
                });
            });

            const filteredNodes = currentNodes.filter(node => !nodesToMerge.includes(node.id));

            const filteredEdges = newEdges.filter(edge =>
                !nodesToMerge.includes(edge.source) &&
                !nodesToMerge.includes(edge.target)
            );

            setNodes(filteredNodes);
            setEdges(filteredEdges);

            handleClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleNodeSelection = (nodeId: string) => {
        setSelectedNodeIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(nodeId)) {
                // eslint-disable-next-line drizzle/enforce-delete-with-where
                newSet.delete(nodeId);
            } else {
                newSet.add(nodeId);
            }
            return newSet;
        });
    };

    // Handle mouse down for dragging - expanded to include more draggable areas
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        const isDraggableArea = (e.target as HTMLElement).closest('.modal-header') ||
            (e.target as HTMLElement).closest('.draggable-area');

        if (isDraggableArea) {
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

    const handleMouseEnter = (nodeId: string) => {
        setHoveredNodeId(nodeId);
    };

    const handleMouseLeave = () => {
        setHoveredNodeId(null);
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
                    <h3 className="text-sm font-medium">Merge Duplicate Points</h3>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleClose}
                    >
                        <XIcon className="h-4 w-4" />
                    </Button>
                </div>

                {/* Point Info Section - Also Draggable */}
                <div className="draggable-area px-4 py-3 border-b bg-muted/10 cursor-move">
                    <div className="text-sm">
                        {pointData ? (
                            <div>
                                <div className="font-medium mb-1">Duplicate Point:</div>
                                <div className="text-muted-foreground line-clamp-2">{pointData.content}</div>
                                {pointData && (
                                    <div className="mt-2 flex items-center justify-between">
                                        <PointStats
                                            favor={pointData.favor}
                                            amountNegations={pointData.amountNegations}
                                            amountSupporters={pointData.amountSupporters}
                                            cred={pointData.cred}
                                        />
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 p-0 rounded-full"
                                                    onClick={() => {
                                                        window.open(getPointUrl(pointData.pointId), '_blank', 'noopener,noreferrer');
                                                    }}
                                                >
                                                    <ExternalLinkIcon className="h-3.5 w-3.5" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top">
                                                <p>Open in new tab</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-16 bg-muted/40 animate-pulse rounded-md" />
                        )}
                    </div>
                </div>

                {/* Instructions */}
                <div className="px-4 py-2 border-b bg-muted/5">
                    <div className="text-xs text-muted-foreground">
                        Select multiple duplicate nodes to merge them. The first selected node will be kept, and all other selected nodes will be merged into it.
                        <div className="mt-1 italic">Hover over a node to highlight it in the graph.</div>
                    </div>
                </div>

                {/* Nodes Selection */}
                <div className="flex-grow overflow-y-auto p-3 space-y-3">
                    <div className="text-sm font-medium mb-2">Select nodes to merge:</div>
                    {processedNodes.map((node) => (
                        <div
                            key={`merge-${node.id}`}
                            className={cn(
                                "flex items-start p-2 border rounded-md cursor-pointer hover:bg-muted/20 transition-colors",
                                selectedNodeIds.has(node.id) && "border-purple-500 bg-purple-500/10",
                                hoveredNodeId === node.id && "ring-2 ring-yellow-500"
                            )}
                            onClick={() => toggleNodeSelection(node.id)}
                            onMouseEnter={() => handleMouseEnter(node.id)}
                            onMouseLeave={handleMouseLeave}
                        >
                            <div className="w-4 h-4 mt-1 mr-2 flex-shrink-0 flex items-center justify-center border rounded-sm">
                                {selectedNodeIds.has(node.id) && (
                                    <CheckIcon className="h-3 w-3" />
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="text-xs text-muted-foreground">
                                    <div className="mb-1 font-medium">Connected to:</div>
                                    <div className="flex flex-wrap gap-1 mb-1">
                                        {node.hasStatementParent && (
                                            <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-500 border border-blue-500/30 rounded-full text-xs">Statement</span>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        {node.parentPoints.map((parent, i) => (
                                            <div key={i} className="text-xs line-clamp-2 bg-muted/10 p-1.5 rounded">
                                                <span className="px-1.5 py-0.5 bg-muted rounded-full text-xs mr-1 mb-1 inline-block">Parent</span>
                                                <div className="mt-0.5 leading-relaxed">{parent.content}</div>
                                            </div>
                                        ))}
                                        {node.parentPoints.length === 0 && !node.hasStatementParent && (
                                            <div className="text-xs italic text-muted-foreground">No parent connections</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-3 py-3.5 border-t bg-background">
                    <Button
                        className="w-full gap-2 relative h-9"
                        onClick={handleSubmit}
                        disabled={selectedNodeIds.size < 2 || isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <span className="opacity-0">Merge Points</span>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="size-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                                </div>
                            </>
                        ) : (
                            <>
                                <GitMergeIcon className="size-4" />
                                Merge Selected Points ({selectedNodeIds.size})
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </Portal>
    );
};

export default MergePointsDialog; 