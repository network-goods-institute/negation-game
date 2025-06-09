"use client";

import React, {
    useState,
    useEffect,
    useCallback,
} from "react";
import { createPortal } from "react-dom";
import { useAtom } from "jotai";
import { connectNodesDialogAtom } from "@/atoms/connectNodesAtom";
import {
    useReactFlow,
    useStore,
} from "@xyflow/react";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { PreviewAppNode } from "@/types/rationaleGraph";

type BBox = { x: number; y: number; w: number; h: number };

function computeBoundingBox(n1?: PreviewAppNode, n2?: PreviewAppNode, pad = 24): BBox | null {
    if (!n1 || !n2) return null;

    const n1w = n1.measured?.width ?? 250;
    const n1h = n1.measured?.height ?? 160;
    const n2w = n2.measured?.width ?? 250;
    const n2h = n2.measured?.height ?? 160;

    const minX = Math.min(n1.position.x, n2.position.x);
    const minY = Math.min(n1.position.y, n2.position.y);
    const maxX = Math.max(n1.position.x + n1w, n2.position.x + n2w);
    const maxY = Math.max(n1.position.y + n1h, n2.position.y + n2h);

    return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
}

export default function PreviewConnectNodesFrame() {
    const [dialog, setDialog] = useAtom(connectNodesDialogAtom);
    const { isOpen, sourceId, targetId, onClose } = dialog;

    const rf = useReactFlow<PreviewAppNode>();
    const nodesArray = useStore((s: any) => s.nodes as PreviewAppNode[]);
    const [isDragging, setIsDragging] = useState(false);
    const [bbox, setBBox] = useState<BBox | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);

    const recalcBBox = useCallback(() => {
        if (!isOpen) {
            setBBox(null);
            return;
        }
        const n1 = nodesArray.find((n) => n.id === sourceId);
        const n2 = nodesArray.find((n) => n.id === targetId);
        setBBox(computeBoundingBox(n1, n2));
    }, [isOpen, nodesArray, sourceId, targetId]);

    useEffect(() => {
        const isAnyNodeDragging = nodesArray.some(node => node.dragging);
        setIsDragging(isAnyNodeDragging);
        if (!isAnyNodeDragging && isOpen) {
            recalcBBox();
        }
    }, [nodesArray, isOpen, recalcBBox]);

    useEffect(recalcBBox, [recalcBBox]);
    useEffect(() => { if (!isDragging) recalcBBox(); }, [isDragging, recalcBBox]);
    useEffect(() => { if (!isDragging) recalcBBox(); }, [nodesArray, isDragging, recalcBBox]);

    const sourceNode = rf.getNode(sourceId);
    const targetNode = rf.getNode(targetId);

    const close = useCallback(() => {
        setDialog({ isOpen: false, sourceId: "", targetId: "", onClose: undefined });
        onClose?.();
    }, [setDialog, onClose]);

    const handleConnect = useCallback(async () => {
        if (!sourceNode || !targetNode) return close();

        setIsConnecting(true);
        try {
            // For preview, we just add the edge locally without database operations
            const edgeId = `edge-${sourceId}-${targetId}-${Date.now()}`;

            // Check if edge already exists
            const existingEdges = rf.getEdges();
            const edgeExists = existingEdges.some(edge =>
                (edge.source === sourceId && edge.target === targetId) ||
                (edge.source === targetId && edge.target === sourceId)
            );

            if (!edgeExists) {
                rf.addEdges({
                    id: edgeId,
                    source: sourceId,
                    target: targetId,
                    type: "negation",
                    sourceHandle: `${sourceId}-add-handle`,
                    targetHandle: `${targetId}-target`
                });
            }

            // For preview nodes, we might want to update the parent relationship
            rf.updateNodeData(sourceId, {
                ...sourceNode.data,
                parentId: targetId,
            });
        } finally {
            setIsConnecting(false);
            close();
        }
    }, [
        rf,
        sourceId,
        targetId,
        sourceNode,
        targetNode,
        close,
    ]);

    if (!isOpen || !bbox) return null;

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
            <div className="w-full h-full rounded-xl border-4 border-purple-500" />

            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            size="sm"
                            onClick={handleConnect}
                            disabled={isConnecting}
                            style={{ pointerEvents: "auto" }}
                            className="absolute -bottom-6 -right-6 rounded-full border-4 border-purple-500 dark:border-purple-300 bg-background text-foreground"
                        >
                            {isConnecting ? "Connecting…" : "Connect"}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        <p>Connects the selected nodes with a negation edge.</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>,
        mount
    );
} 