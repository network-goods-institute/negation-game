"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAtom } from "jotai";
import { connectNodesDialogAtom } from "@/atoms/connectNodesAtom";
import { useReactFlow } from "@xyflow/react";
import { usePointData } from "@/queries/points/usePointData";
import { Portal } from "@radix-ui/react-portal";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";
import { useNegate } from "@/mutations/points/useNegate";
import { usePointNegations } from "@/queries/points/usePointNegations";

export default function ConnectNodesDialog() {
    const [dialogState, setDialogState] = useAtom(connectNodesDialogAtom);
    const { isOpen, sourceId, targetId, onClose } = dialogState;
    const reactFlow = useReactFlow();
    const modalRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [modalSize, setModalSize] = useState({ width: 350, height: 220 });
    const [isMobile, setIsMobile] = useState(false);
    const { mutateAsync: createNegation, isPending: isCreating } = useNegate();

    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (isOpen) {
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const width = isMobile ? Math.min(300, viewportWidth - 32) : Math.min(350, viewportWidth - 40);
            const height = isMobile ? 200 : 220;
            setModalSize({ width, height });
            const x = isMobile
                ? (viewportWidth - width) / 2
                : viewportWidth - width - 20;
            const y = viewportHeight - height - (isMobile ? 16 : 100);
            setPosition({ x, y });
        }
    }, [isOpen, isMobile]);

    const sourceNode = reactFlow.getNode(sourceId) as any;
    const targetNode = reactFlow.getNode(targetId) as any;
    const sourcePointId: number | undefined = sourceNode?.data?.pointId;
    const targetPointId: number | undefined = targetNode?.data?.pointId;
    const { data: sourceData } = usePointData(sourcePointId);
    const { data: targetData } = usePointData(targetPointId);
    const { data: sourceNegations = [] } = usePointNegations(sourcePointId ?? null);

    const handleConfirm = async () => {
        if (sourcePointId == null || targetPointId == null) {
            setDialogState({ isOpen: false, sourceId: '', targetId: '', onClose: undefined });
            onClose?.();
            return;
        }
        const exists = sourceNegations.some(n => n.pointId === targetPointId);
        if (exists) {
            const edgeIdExists = `edge-${sourceId}-${targetId}-${Date.now()}`;
            reactFlow.addEdges({ id: edgeIdExists, source: sourceId, target: targetId, type: 'negation' });
            reactFlow.updateNodeData(sourceId, {
                ...sourceNode.data,
                parentId: targetId,
                _lastModified: Date.now(),
            });

            setDialogState({ isOpen: false, sourceId: '', targetId: '', onClose: undefined });
            onClose?.();
            return;
        }
        try {
            // Persist negation on server
            await createNegation({ negatedPointId: sourcePointId!, counterpointId: targetPointId! });
            const edgeId = `edge-${sourceId}-${targetId}-${Date.now()}`;
            reactFlow.addEdges({ id: edgeId, source: sourceId, target: targetId, type: 'negation' });
            reactFlow.updateNodeData(sourceId, {
                ...sourceNode.data,
                parentId: targetId,
                _lastModified: Date.now(),
            });
        } catch (error: any) {
            // error handled by useNegate onError toast
        } finally {
            setDialogState({ isOpen: false, sourceId: '', targetId: '', onClose: undefined });
            onClose?.();
        }
    };

    const handleCancel = () => {
        setDialogState({ isOpen: false, sourceId: '', targetId: '', onClose: undefined });
        onClose?.();
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        isDragging.current = true;
        const clientX = e.clientX;
        const clientY = e.clientY;
        dragStart.current = { x: clientX - position.x, y: clientY - position.y };
        e.stopPropagation();
        e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.current) return;
        const clientX = e.clientX;
        const clientY = e.clientY;
        const newX = clientX - dragStart.current.x;
        const newY = clientY - dragStart.current.y;
        const maxX = window.innerWidth - modalSize.width;
        const maxY = window.innerHeight - modalSize.height;
        setPosition({ x: Math.max(0, Math.min(newX, maxX)), y: Math.max(0, Math.min(newY, maxY)) });
        e.stopPropagation();
        e.preventDefault();
    };

    const handleMouseUp = () => { isDragging.current = false; };

    useEffect(() => {
        if (!isOpen) return;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, modalSize]);

    if (!isOpen) return null;
    return (
        <Portal>
            <div
                ref={modalRef}
                className="fixed z-50 bg-background rounded-md border shadow-md overflow-hidden flex flex-col"
                style={{ left: position.x, top: position.y, width: modalSize.width, maxHeight: modalSize.height }}
                onMouseDown={handleMouseDown}
            >
                <div className={cn("dialog-header flex justify-between items-center border-b bg-background px-4 py-2 cursor-move")}>
                    <div className="flex flex-col">
                        <span className="font-medium">Connect Nodes with Negation</span>
                        <span className="text-xs text-muted-foreground">
                            This will create a new edge on the graph, with the node you last touched being the receiver of it. This creates a new negation in the background if it does not exist.
                        </span>
                    </div>
                    <Button size="icon" variant="ghost" onClick={handleCancel} aria-label="Close">
                        <XIcon className="h-4 w-4 text-muted-foreground" />
                    </Button>
                </div>

                <div className="flex-grow overflow-y-auto p-4 text-sm">
                    <p>Source: <strong>{sourceData?.content}</strong></p>
                    <p>Target: <strong>{targetData?.content}</strong></p>
                </div>
                <div className="flex justify-end gap-2 px-4 py-2 border-t">
                    <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                    <Button onClick={handleConfirm} disabled={isCreating}>
                        {isCreating ? 'Connecting...' : 'Connect'}
                    </Button>
                </div>
            </div>
        </Portal>
    );
} 