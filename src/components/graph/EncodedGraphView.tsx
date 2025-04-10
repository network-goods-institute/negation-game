"use client";

// Do not ever use this for viewpoints, this is specfically for the graph view for plain points only.

import React from 'react';
import { GlobalExpandPointDialog } from "@/components/graph/ExpandPointDialog";
import { MergeNodesDialog } from "@/components/graph/MergeNodesDialog";

import { AddPointNode } from "@/components/graph/AddPointNode";
import { AppNode } from "@/components/graph/AppNode";
import { NegationEdge } from "@/components/graph/NegationEdge";
import { PointNode } from "@/components/graph/PointNode";
import { StatementNode } from "@/components/graph/StatementNode";
import { Button } from "@/components/ui/button";
import {
    Background,
    BackgroundVariant,
    ColorMode,
    Controls,
    Edge,
    EdgeChange,
    MiniMap,
    NodeChange,
    Panel,
    ReactFlow,
    ReactFlowProps,
    useEdgesState,
    useNodesState,
} from "@xyflow/react";
import { XIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useMemo } from "react";
import { useSetAtom } from "jotai";
import { hoveredPointIdAtom } from "@/atoms/hoveredPointIdAtom";

export interface GraphViewProps extends ReactFlowProps<AppNode> {
    rootPointId?: number;
    statement?: string;
    onClose?: () => void;
    closeButtonClassName?: string;
    onNodeMouseEnter?: (event: React.MouseEvent, node: AppNode) => void;
    onNodeMouseLeave?: (event: React.MouseEvent, node: AppNode) => void;
}

export const GraphView = ({
    rootPointId,
    statement: statement,
    onClose,
    closeButtonClassName,
    onNodesChange: onNodesChangeProp,
    onEdgesChange: onEdgesChangeProp,
    onNodeMouseEnter: onNodeMouseEnterProp,
    onNodeMouseLeave: onNodeMouseLeaveProp,
    ...props
}: GraphViewProps) => {
    const [nodes, setNodes, onNodesChangeDefault] = useNodesState<AppNode>([]);
    const [edges, setEdges, onEdgesChangeDefault] = useEdgesState<Edge>([]);
    const { theme } = useTheme();
    const setHoveredPointId = useSetAtom(hoveredPointIdAtom);

    const onNodesChange = useCallback(
        (changes: NodeChange<AppNode>[]) => {
            onNodesChangeDefault(changes);
            onNodesChangeProp?.(changes);
        },
        [onNodesChangeDefault, onNodesChangeProp]
    );

    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            onEdgesChangeDefault(changes);
            onEdgesChangeProp?.(changes);
        },
        [onEdgesChangeDefault, onEdgesChangeProp]
    );

    React.useEffect(() => {
        if (props.nodes) {
            setNodes(props.nodes);
        }
    }, [props.nodes, setNodes]);

    React.useEffect(() => {
        if (props.edges) {
            setEdges(props.edges);
        }
    }, [props.edges, setEdges]);

    const nodeTypes = useMemo(
        () => ({
            point: (props: any) => (
                <PointNode {...props} />
            ),
            statement: StatementNode,
            addPoint: AddPointNode,
        }),
        []
    );
    const edgeTypes = useMemo(() => ({ negation: NegationEdge }), []);

    const handleNodeMouseEnter = useCallback((event: React.MouseEvent, node: AppNode) => {
        if (node.type === 'point') {
            setHoveredPointId(node.data.pointId);
        }
        onNodeMouseEnterProp?.(event, node);
    }, [setHoveredPointId, onNodeMouseEnterProp]);

    const handleNodeMouseLeave = useCallback((event: React.MouseEvent, node: AppNode) => {
        if (node.type === 'point') {
            setHoveredPointId(undefined);
        }
        onNodeMouseLeaveProp?.(event, node);
    }, [setHoveredPointId, onNodeMouseLeaveProp]);

    return (
        <ReactFlow
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            nodes={nodes}
            onNodesChange={onNodesChange}
            edges={edges}
            onEdgesChange={onEdgesChange}
            panOnScroll
            zoomOnPinch
            minZoom={0.2}
            colorMode={theme as ColorMode}
            proOptions={{ hideAttribution: true }}
            onNodeMouseEnter={handleNodeMouseEnter}
            onNodeMouseLeave={handleNodeMouseLeave}
            {...props}
        >
            {!!onClose && (
                <Panel position="top-right" className={closeButtonClassName}>
                    <Button size="icon" variant={"ghost"} onClick={onClose}>
                        <XIcon />
                    </Button>
                </Panel>
            )}
            <Background
                bgColor="hsl(var(--background))"
                color="hsl(var(--muted))"
                variant={BackgroundVariant.Dots}
            />
            <MiniMap
                zoomable
                pannable
                className="[&>svg]:w-[120px] [&>svg]:h-[90px] sm:[&>svg]:w-[200px] sm:[&>svg]:h-[150px]"
            />
            <Controls />
            <GlobalExpandPointDialog />
            <MergeNodesDialog />
        </ReactFlow>
    );
};