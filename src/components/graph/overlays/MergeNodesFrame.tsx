"use client";
import { Button } from "@/components/ui/button";
import { useAtom } from "jotai";
import { mergeNodesDialogAtom } from "@/atoms/mergeNodesAtom";
import { useReactFlow, useStore, Node } from "@xyflow/react";
import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";import { logger } from "@/lib/logger";

type BBox = { x: number; y: number; w: number; h: number };

function computeBoundingBox(
    nodes: (Node | undefined)[],
    pad = 24
): BBox | null {
    if (!nodes || nodes.length === 0 || nodes.every(n => !n))
        return null;

    const validNodes = nodes.filter(n => n !== undefined) as Node[];
    if (validNodes.length === 0) return null;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    validNodes.forEach(node => {
        const w = node.measured?.width ?? 250;
        const h = node.measured?.height ?? 160;

        minX = Math.min(minX, node.position.x);
        minY = Math.min(minY, node.position.y);
        maxX = Math.max(maxX, node.position.x + w);
        maxY = Math.max(maxY, node.position.y + h);
    });

    return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
}

export const MergeNodesFrame = () => {
    const [dialogState, setDialogState] = useAtom(mergeNodesDialogAtom);
    const [isMerging, setIsMerging] = useState(false);
    const { getEdges, setEdges, setNodes } = useReactFlow();
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [modalSize, setModalSize] = useState({ width: 350, height: 250 });
    const [isMobile, setIsMobile] = useState(false);

    const isPositionSet = useRef(false);

    const nodesArray = useStore((s: any) => s.nodes as Node[]);
    const isAnyNodeDragging = useMemo(
        () => nodesArray.some((node) => node.dragging),
        [nodesArray]
    );
    const bbox = useMemo(() => {
        if (
            !dialogState.isOpen ||
            !dialogState.duplicateNodes ||
            dialogState.duplicateNodes.length <= 1 ||
            isAnyNodeDragging
        ) {
            return null;
        }
        const nodesToMerge = dialogState.duplicateNodes.map((dupNode) =>
            nodesArray.find((n) => n.id === dupNode.id)
        );
        return computeBoundingBox(nodesToMerge);
    }, [dialogState.isOpen, dialogState.duplicateNodes, nodesArray, isAnyNodeDragging]);

    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);

            if (mobile) {
                setModalSize({
                    width: Math.min(300, window.innerWidth - 32),
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

        if (dialogState.isOpen && !isPositionSet.current) {
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            const currentModalSize = window.innerWidth < 768
                ? { width: Math.min(300, window.innerWidth - 32), height: 230 }
                : { width: Math.min(350, window.innerWidth - 40), height: 250 };

            if (window.innerWidth < 768) {
                setPosition({
                    x: (viewportWidth - currentModalSize.width) / 2,
                    y: viewportHeight - currentModalSize.height - 16
                });
            } else {
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
    }, [dialogState.isOpen]);

    useEffect(() => {
        if (!dialogState.isOpen) {
            isPositionSet.current = false;
        }
    }, [dialogState.isOpen]);

    const handleClose = () => {
        if (dialogState.onClose) {
            dialogState.onClose();
        }
        setDialogState(state => ({ ...state, isOpen: false, duplicateNodes: [] }));
    };

    const handleMerge = async () => {
        if (!dialogState.duplicateNodes || dialogState.duplicateNodes.length <= 1) {
            handleClose();
            return;
        }

        setIsMerging(true);
        try {
            const targetNodeId = dialogState.duplicateNodes[0].id;
            const nodesToRemove = dialogState.duplicateNodes.slice(1).map(node => node.id);

            const edgesToReroute = getEdges().filter(edge =>
                nodesToRemove.includes(edge.source) || nodesToRemove.includes(edge.target)
            );

            const newEdges = edgesToReroute.map(edge => {
                const newEdge = { ...edge, id: `edge-${targetNodeId}-${edge.target === targetNodeId ? edge.source : edge.target}-${Date.now()}` };
                if (nodesToRemove.includes(edge.source)) {
                    newEdge.source = targetNodeId;
                }
                if (nodesToRemove.includes(edge.target)) {
                    newEdge.target = targetNodeId;
                }
                return newEdge;
            });

            const uniqueEdges = new Map();
            newEdges.forEach(edge => {
                const key = `${edge.source}-${edge.target}`;
                uniqueEdges.set(key, edge);
            });

            setEdges(edges => {
                const remainingEdges = edges.filter(edge =>
                    !nodesToRemove.includes(edge.source) && !nodesToRemove.includes(edge.target)
                );
                const currentEdgeIds = new Set(remainingEdges.map(e => `${e.source}-${e.target}`));
                const filteredNewEdges = Array.from(uniqueEdges.values()).filter(newEdge =>
                    !currentEdgeIds.has(`${newEdge.source}-${newEdge.target}`)
                );
                return [...remainingEdges, ...filteredNewEdges];
            });

            setNodes(nodes => nodes.filter(node => !nodesToRemove.includes(node.id)));

            handleClose();
        } catch (error) {
            logger.error("Error merging points:", error);
        } finally {
            setIsMerging(false);
        }
    };

    if (!dialogState.isOpen || !dialogState.duplicateNodes || dialogState.duplicateNodes.length <= 1 || !bbox) return null;

    const mount = document.querySelector(".react-flow__viewport");
    if (!mount) return null;

    return createPortal(
        <div
            style={{
                position: "absolute",
                left: bbox.x,
                top: bbox.y,
                width: bbox.w,
                height: bbox.h,
                pointerEvents: "none",
            }}
            className="z-10"
        >
            <div className="w-full h-full rounded-xl border-4 border-blue-500" />

            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            size="sm"
                            onClick={handleMerge}
                            disabled={isMerging}
                            style={{ pointerEvents: "auto" }}
                            className="absolute -bottom-6 -right-6 rounded-full border-4 border-blue-500 dark:border-blue-300 bg-background text-foreground"
                        >
                            {isMerging ? (
                                <>
                                    <span className="opacity-0">Merge</span>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="size-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                                    </div>
                                </>
                            ) : (
                                "Merge"
                            )}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        <p>Merge overlapping nodes that represent the same point.</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>,
        mount
    );
}; 
