"use client";

import React, {
    useState,
    useEffect,
    useCallback,
    useRef,
} from "react";
import { createPortal } from "react-dom";
import { useAtom } from "jotai";
import { connectNodesDialogAtom } from "@/atoms/connectNodesAtom";
import {
    useReactFlow,
    useStore,
    Node,
} from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { useNegate } from "@/mutations/points/useNegate";
import { usePointNegations } from "@/queries/points/usePointNegations";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

type BBox = { x: number; y: number; w: number; h: number };

function computeBoundingBox(
    n1: Node | undefined,
    n2: Node | undefined,
    pad = 24
): BBox | null {
    if (!n1 || !n2) return null;

    const w1 = n1.measured?.width ?? 250;
    const h1 = n1.measured?.height ?? 160;
    const w2 = n2.measured?.width ?? 250;
    const h2 = n2.measured?.height ?? 160;

    const minX = Math.min(n1.position.x, n2.position.x);
    const minY = Math.min(n1.position.y, n2.position.y);
    const maxX = Math.max(n1.position.x + w1, n2.position.x + w2);
    const maxY = Math.max(n1.position.y + h1, n2.position.y + h2);

    return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
}

export default function ConnectNodesFrame() {
    const [dialog, setDialog] = useAtom(connectNodesDialogAtom);
    const { isOpen, sourceId, targetId, onClose } = dialog;

    const rf = useReactFlow();
    const nodesArray = useStore((s: any) => s.nodes as Node[]);
    const [isDragging, setIsDragging] = useState(false);
    const [bbox, setBBox] = useState<BBox | null>(null);

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

    const { mutateAsync: createNegation, isPending } = useNegate();

    const sourceNode = rf.getNode(sourceId);
    const targetNode = rf.getNode(targetId);
    const sourcePoint = (sourceNode?.data as any)?.pointId as number | undefined;
    const targetPoint = (targetNode?.data as any)?.pointId as number | undefined;
    const { data: sourceNegations = [] } = usePointNegations(sourcePoint ?? null);

    const close = useCallback(() => {
        setDialog({ isOpen: false, sourceId: "", targetId: "", onClose: undefined });
        onClose?.();
    }, [setDialog, onClose]);

    const handleConnect = useCallback(async () => {
        if (sourcePoint == null || targetPoint == null) return close();

        const edgeId = `edge-${sourceId}-${targetId}-${Date.now()}`;

        // already exists?
        if (sourceNegations.some((n) => n.pointId === targetPoint)) {
            rf.addEdges({ id: edgeId, source: sourceId, target: targetId, type: "negation" });
            rf.updateNodeData(sourceId, {
                ...(sourceNode!.data as any),
                parentId: targetId,
                _lastModified: Date.now(),
            });
            return close();
        }

        try {
            await createNegation({ negatedPointId: sourcePoint, counterpointId: targetPoint });
            rf.addEdges({ id: edgeId, source: sourceId, target: targetId, type: "negation" });
            rf.updateNodeData(sourceId, {
                ...(sourceNode!.data as any),
                parentId: targetId,
                _lastModified: Date.now(),
            });
        } finally {
            close();
        }
    }, [
        createNegation,
        rf,
        sourceId,
        targetId,
        sourcePoint,
        targetPoint,
        sourceNegations,
        sourceNode,
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
                            disabled={isPending}
                            style={{ pointerEvents: "auto" }}
                            className="absolute -bottom-6 -right-6 rounded-full border-4 border-purple-500 bg-background"
                        >
                            {isPending ? "Connecting…" : "Connect"}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        <p>Connects the selected nodes with a negation edge. Creates a new negation if none exists.</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>,
        mount
    );
}