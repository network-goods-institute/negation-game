import React, { useState } from 'react';
import {
    ReactFlow,
    MiniMap,
    Controls,
    Background,
    Panel,
    BackgroundVariant,
    OnNodesChange,
    OnEdgesChange,
    useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTheme } from "next-themes";
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { nanoid } from 'nanoid';
import { Save, Loader2, CheckCircle } from 'lucide-react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { AuthenticatedActionButton } from '@/components/AuthenticatedActionButton';
import { PreviewAppNode, PreviewAppEdge, nodeTypes, edgeTypes } from '@/types/rationaleGraph';

interface RationaleVisualFeedProps {
    nodes: PreviewAppNode[];
    edges: PreviewAppEdge[];
    onNodesChange: OnNodesChange<PreviewAppNode>;
    onEdgesChange: OnEdgesChange<PreviewAppEdge>;
    onSaveGraph: () => void;
    onDiscard: () => void;
    graphModified: boolean;
    isSaving: boolean;
    isCreatingRationale: boolean;
    onCreateRationaleClick: () => void;
}

export const RationaleVisualFeed: React.FC<RationaleVisualFeedProps> = ({
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onSaveGraph,
    onDiscard,
    graphModified,
    isSaving,
    isCreatingRationale,
    onCreateRationaleClick
}) => {
    const { theme } = useTheme();
    const [targetNodeId, setTargetNodeId] = useState<string | null>(null);
    const reactFlowInstance = useReactFlow<PreviewAppNode, PreviewAppEdge>();

    const handleAddNegationClick = (nodeId: string) => {
        setTargetNodeId(nodeId);
    };

    const handleAddAddPointNode = (targetId: string) => {
        const targetNode = reactFlowInstance.getNode(targetId) as PreviewAppNode | undefined;
        if (!targetNode) return;

        const uniqueId = `previewaddpoint-${nanoid()}`;
        reactFlowInstance.addNodes({
            id: uniqueId,
            type: 'addPoint',
            data: {
                parentId: targetId,
            },
            position: {
                x: targetNode.position.x,
                y: targetNode.position.y + (targetNode.height || 100) + 50, // Position below parent
            },
        });

        reactFlowInstance.addEdges({
            id: `edge-${nanoid()}`,
            source: targetId,
            sourceHandle: `${targetId}-add-handle`, // Ensure this handle exists on point/statement nodes
            target: uniqueId,
            targetHandle: `${uniqueId}-target`, // Ensure this handle exists on addPoint node
            type: 'negation', // Or a generic 'default' edge type
        });
    };

    return (
        <div className="h-full w-full">
            <ContextMenu.Root>
                <ContextMenu.Trigger>
                    <ReactFlow<PreviewAppNode, PreviewAppEdge>
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        nodeTypes={nodeTypes}
                        edgeTypes={edgeTypes}
                        fitView
                        panOnDrag={true}
                        zoomOnScroll={true}
                        zoomOnPinch={true}
                        zoomOnDoubleClick={true}
                        nodesDraggable={true}
                        nodesConnectable={true}
                        elementsSelectable={true}
                        proOptions={{ hideAttribution: true }}
                        minZoom={0.2}
                        colorMode={theme as any}
                        onNodeContextMenu={(event, node) => {
                            if (node.type === 'statement' || node.type === 'point') {
                                event.preventDefault();
                                setTargetNodeId(node.id);
                            }
                        }}
                    >
                        <Background
                            bgColor="hsl(var(--background))"
                            color="hsl(var(--muted))"
                            variant={BackgroundVariant.Dots}
                        />

                        <Panel position="top-right" className="m-2 mt-20 flex flex-col space-y-2 items-end">
                            <div className="flex flex-col space-y-2">
                                <Button
                                    onClick={onSaveGraph}
                                    disabled={!graphModified || isSaving}
                                    size="sm"
                                    className={cn(
                                        "shadow-lg w-[160px]",
                                        (!graphModified || isSaving) && "opacity-50"
                                    )}
                                >
                                    {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                                    Save Graph
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={onDiscard}
                                    disabled={!graphModified || isSaving}
                                    size="sm"
                                    className={cn(
                                        "shadow-lg w-[160px]",
                                        (!graphModified || isSaving) && "opacity-50"
                                    )}
                                >
                                    Discard
                                </Button>
                            </div>
                            <AuthenticatedActionButton
                                onClick={onCreateRationaleClick}
                                disabled={isSaving || isCreatingRationale}
                                size="sm"
                                className="shadow-lg w-[160px]"
                            >
                                {(isSaving || isCreatingRationale) ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                Create Rationale
                            </AuthenticatedActionButton>
                        </Panel>

                        <Panel position="bottom-left" className="m-2">
                            <div className="relative bottom-[120px] mb-4">
                                <Controls />
                            </div>
                        </Panel>

                        <Panel position="bottom-right" className="mr-4 mb-4">
                            <div className="relative bottom-[120px]">
                                <MiniMap
                                    nodeStrokeWidth={3}
                                    zoomable
                                    pannable
                                    className="[&>svg]:w-[120px] [&>svg]:h-[90px] sm:[&>svg]:w-[200px] sm:[&>svg]:h-[150px]"
                                />
                            </div>
                        </Panel>
                    </ReactFlow>
                </ContextMenu.Trigger>
                <ContextMenu.Content className="bg-popover border rounded-md shadow-md p-1 z-50 min-w-[150px]">
                    {targetNodeId && (
                        <>
                            <ContextMenu.Item
                                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent focus:bg-accent hover:text-accent-foreground focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                onSelect={() => handleAddNegationClick(targetNodeId)}
                            >
                                Add Negation (Placeholder)
                            </ContextMenu.Item>
                            <ContextMenu.Item
                                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent focus:bg-accent hover:text-accent-foreground focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                onSelect={() => handleAddAddPointNode(targetNodeId)}
                            >
                                Add Preview Point Node
                            </ContextMenu.Item>
                        </>
                    )}
                </ContextMenu.Content>
            </ContextMenu.Root>
        </div>
    );
}; 