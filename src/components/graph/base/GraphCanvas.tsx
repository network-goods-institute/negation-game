"use client";

import React, { memo } from "react";
import {
    ReactFlow,
    Background,
    BackgroundVariant,
    ColorMode,
    ReactFlowInstance,
    ReactFlowProps,
    NodeChange,
    EdgeChange,
    Edge,
} from "@xyflow/react";
import { useTheme } from "next-themes";
import type { AppNode } from "@/components/graph/nodes/AppNode";

export interface GraphCanvasProps
    extends Omit<
        ReactFlowProps<AppNode>,
        "nodes" | "edges" | "nodeTypes" | "edgeTypes" | "onNodesChange" | "onEdgesChange"
    > {
    nodes: AppNode[];
    edges: Edge[];
    nodeTypes: Record<string, React.ComponentType<any>>;
    edgeTypes: Record<string, React.ComponentType<any>>;
    onNodesChange: (changes: NodeChange<AppNode>[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    onInit?: (instance: ReactFlowInstance<AppNode>) => void;
    nodesDraggable?: boolean;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = memo(
    ({
        nodes,
        edges,
        nodeTypes,
        edgeTypes,
        onNodesChange,
        onEdgesChange,
        onInit,
        nodesDraggable,
        ...props
    }) => {
        const { theme } = useTheme();
        
        // Right-click context menu handler for graph canvas
        // Currently disabled - uncomment to enable context menu functionality
        // const handlePaneContextMenu = (event: React.MouseEvent) => {
        //     event.preventDefault();
        //     // Add context menu logic here
        // };

        return (
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onInit={onInit}
                minZoom={0.2}
                panOnScroll
                zoomOnPinch
                colorMode={theme as ColorMode}
                proOptions={{ hideAttribution: true }}
                nodesDraggable={nodesDraggable}
                // onPaneContextMenu={handlePaneContextMenu}
                {...props}
            >
                <Background
                    bgColor="hsl(var(--background))"
                    color="hsl(var(--muted))"
                    variant={BackgroundVariant.Dots}
                />
                {/* Controls and MiniMap are rendered via GraphControls */}
                {props.children}
            </ReactFlow>
        );
    }
);

GraphCanvas.displayName = 'GraphCanvas'; 