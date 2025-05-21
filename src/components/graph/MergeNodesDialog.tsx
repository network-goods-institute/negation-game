"use client";
import { GitMergeIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAtom } from "jotai";
import { mergeNodesDialogAtom } from "@/atoms/mergeNodesAtom";
import { useReactFlow } from "@xyflow/react";
import { usePointData } from "@/queries/usePointData";
import { useState, useEffect, useRef } from "react";
import { Portal } from "@radix-ui/react-portal";
import { cn } from "@/lib/cn";

export const MergeNodesDialog = () => {
    const [dialogState, setDialogState] = useAtom(mergeNodesDialogAtom);
    const [isMerging, setIsMerging] = useState(false);
    const { getEdges, setEdges, setNodes } = useReactFlow();
    const { data: pointData } = usePointData(dialogState.pointId);
    const modalRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [modalSize, setModalSize] = useState({ width: 350, height: 250 });
    const [isMobile, setIsMobile] = useState(false);

    // Dragging functionality
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const isPositionSet = useRef(false);

    // Set initial position on first render if dialog is open
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);

            // Update the modal size based on screen size
            if (mobile) {
                setModalSize({
                    width: Math.min(300, window.innerWidth - 32), // Smaller width on mobile with margins
                    height: 230
                });
            } else {
                setModalSize({
                    width: Math.min(350, window.innerWidth - 40),
                    height: 250
                });
            }
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        // Set initial position - FIXED position depending on device
        if (dialogState.isOpen && !isPositionSet.current) {
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            // Get current modal size directly instead of from state
            const currentModalSize = window.innerWidth < 768
                ? { width: Math.min(300, window.innerWidth - 32), height: 230 }
                : { width: Math.min(350, window.innerWidth - 40), height: 250 };

            if (window.innerWidth < 768) {
                // Center at the bottom on mobile
                setPosition({
                    x: (viewportWidth - currentModalSize.width) / 2,
                    y: viewportHeight - currentModalSize.height - 16 // Less padding on mobile
                });
            } else {
                // Bottom right on desktop
                setPosition({
                    x: viewportWidth - currentModalSize.width - 20,
                    y: viewportHeight - currentModalSize.height - 20
                });
            }

            isPositionSet.current = true;
        }

        return () => {
            window.removeEventListener('resize', checkMobile);
        };
    }, [dialogState.isOpen]); // Only depend on dialog open state

    // Reset position initialization when dialog closes
    useEffect(() => {
        if (!dialogState.isOpen) {
            isPositionSet.current = false;
        }
    }, [dialogState.isOpen]);

    const handleClose = () => {
        if (dialogState.onClose) {
            dialogState.onClose();
        }
        setDialogState(state => ({ ...state, isOpen: false }));
    };

    const handleMerge = async () => {
        if (!dialogState.duplicateNodes || dialogState.duplicateNodes.length <= 1) {
            handleClose();
            return;
        }

        setIsMerging(true);
        try {
            // Get the first node (we'll keep this one)
            const targetNodeId = dialogState.duplicateNodes[0].id;
            // Get the other nodes that will be removed
            const nodesToRemove = dialogState.duplicateNodes.slice(1).map(node => node.id);

            // Get all edges connecting to nodes that will be removed
            const edgesToReroute = getEdges().filter(edge =>
                nodesToRemove.includes(edge.source) || nodesToRemove.includes(edge.target)
            );

            // Create new edges connecting to the target node instead
            const newEdges = edgesToReroute.map(edge => {
                const newEdge = { ...edge, id: `edge-${Math.random().toString(36).substring(2, 15)}` };
                if (nodesToRemove.includes(edge.source)) {
                    newEdge.source = targetNodeId;
                }
                if (nodesToRemove.includes(edge.target)) {
                    newEdge.target = targetNodeId;
                }
                return newEdge;
            });

            // Remove duplicate edges (same source and target)
            const uniqueEdges = new Map();
            newEdges.forEach(edge => {
                const key = `${edge.source}-${edge.target}`;
                uniqueEdges.set(key, edge);
            });

            // Update the graph
            setEdges(edges => {
                // Filter out edges connecting to nodes being removed
                const remainingEdges = edges.filter(edge =>
                    !nodesToRemove.includes(edge.source) && !nodesToRemove.includes(edge.target)
                );
                // Add the new rerouted edges
                return [...remainingEdges, ...Array.from(uniqueEdges.values())];
            });

            // Remove the duplicate nodes
            setNodes(nodes => nodes.filter(node => !nodesToRemove.includes(node.id)));

            handleClose();
        } catch (error) {
            console.error("Error merging points:", error);
        } finally {
            setIsMerging(false);
        }
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        // For the header (drag handle), prevent and stop all events
        if ((e.target as HTMLElement).closest('.dialog-header')) {
            if (!(e.target as HTMLElement).closest('button')) {
                isDragging.current = true;

                // Handle both mouse and touch events
                const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
                const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

                dragStart.current = {
                    x: clientX - position.x,
                    y: clientY - position.y
                };

                // Prevent default AND stop propagation
                e.stopPropagation();
                e.preventDefault();
            }
        }

        // For the entire dialog, at least stop propagation to prevent moving the background
        e.stopPropagation();
    };

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
        if (isDragging.current) {
            // Handle both mouse and touch events
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

            const newX = clientX - dragStart.current.x;
            const newY = clientY - dragStart.current.y;

            const maxX = window.innerWidth - (modalRef.current?.offsetWidth || 350);
            const maxY = window.innerHeight - (modalRef.current?.offsetHeight || 250);

            setPosition({
                x: Math.max(0, Math.min(newX, maxX)),
                y: Math.max(0, Math.min(newY, maxY))
            });

            // Stop and prevent all events when dragging
            e.stopPropagation();
            if ('touches' in e) {
                e.preventDefault();
            }
        }
    };

    const handleMouseUp = (e?: MouseEvent | TouchEvent) => {
        isDragging.current = false;

        // Also stop propagation on mouse up
        if (e) {
            e.stopPropagation();
        }
    };

    useEffect(() => {
        if (dialogState.isOpen) {
            // Specific handler for touch move that prevents default
            const handleTouchMove = (e: TouchEvent) => {
                if (isDragging.current) {
                    // Always prevent default when dragging to avoid page scrolling
                    e.preventDefault();

                    const clientX = e.touches[0].clientX;
                    const clientY = e.touches[0].clientY;

                    const newX = clientX - dragStart.current.x;
                    const newY = clientY - dragStart.current.y;

                    const maxX = window.innerWidth - (modalRef.current?.offsetWidth || 350);
                    const maxY = window.innerHeight - (modalRef.current?.offsetHeight || 250);

                    setPosition({
                        x: Math.max(0, Math.min(newX, maxX)),
                        y: Math.max(0, Math.min(newY, maxY))
                    });

                    e.stopPropagation();
                }
            };

            // Add both mouse and touch event listeners
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('touchmove', handleTouchMove, { passive: false });
            document.addEventListener('touchend', handleMouseUp);
            document.addEventListener('touchcancel', handleMouseUp);

            return () => {
                // Remove both mouse and touch event listeners
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.removeEventListener('touchmove', handleTouchMove);
                document.removeEventListener('touchend', handleMouseUp);
                document.removeEventListener('touchcancel', handleMouseUp);
            };
        }
    }, [dialogState.isOpen]);

    if (!dialogState.isOpen || !dialogState.duplicateNodes || dialogState.duplicateNodes.length <= 1) return null;

    return (
        <Portal>
            <div
                ref={modalRef}
                className={cn(
                    "fixed z-[9999] bg-background rounded-lg border-2 shadow-lg overflow-hidden flex flex-col",
                    isMobile ? "border-primary" : ""
                )}
                style={{
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    width: `${modalSize.width}px`,
                    maxHeight: `${modalSize.height}px`,
                }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown as any}
            >
                <div className={cn(
                    "dialog-header flex justify-between items-center border-b bg-background cursor-move relative",
                    isMobile ? "px-2 py-1.5" : "px-4 py-3"
                )}>
                    {/* Add visual grip lines for mobile */}
                    {isMobile && (
                        <div className="absolute left-0 right-0 top-0 flex justify-center">
                            <div className="w-16 h-1 bg-muted rounded-full mt-1" />
                        </div>
                    )}
                    <h3 className={cn(
                        "font-medium flex items-center gap-2 w-full justify-center",
                        isMobile ? "text-xs mt-1.5" : "text-sm"
                    )}>
                        <GitMergeIcon className={isMobile ? "h-3 w-3" : "h-4 w-4"} />
                        Merge Overlapping Points
                    </h3>
                </div>

                <div className={cn(
                    "flex-grow overflow-y-auto",
                    isMobile ? "p-2" : "p-3"
                )}>
                    <p className={cn(
                        "text-muted-foreground mb-2",
                        isMobile ? "text-xs" : "text-sm"
                    )}>
                        {dialogState.duplicateNodes.length} instances of the same point are overlapping.
                    </p>

                    {pointData && (
                        <div className="p-2 border rounded-md mb-3 bg-muted/10">
                            <p className={cn(
                                "font-medium",
                                isMobile ? "text-xs" : "text-sm"
                            )}>
                                {pointData.content}
                            </p>
                        </div>
                    )}

                    <ul className="space-y-2">
                        {dialogState.duplicateNodes.map((node) => (
                            <li key={node.id} className="flex items-center">
                                <XIcon className="h-4 w-4 text-muted-foreground" />
                                <span className="ml-2 flex-1">{node.pointId}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className={cn(
                    "border-t flex justify-center",
                    isMobile ? "p-2" : "p-3"
                )}>
                    <Button
                        size={isMobile ? "sm" : "default"}
                        onClick={handleMerge}
                        disabled={isMerging}
                        className={cn(
                            "relative",
                            isMobile ? "text-xs h-7 px-3" : ""
                        )}
                    >
                        {isMerging ? (
                            <>
                                <span className="opacity-0">Merge Points</span>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="size-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                                </div>
                            </>
                        ) : (
                            <>
                                <GitMergeIcon className={isMobile ? "h-3 w-3 mr-1" : "h-4 w-4 mr-2"} />
                                Merge Points
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </Portal>
    );
}; 