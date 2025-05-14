"use client";

import React, { useEffect, useCallback, useState } from 'react';
import { ChatInputForm } from './ChatInputForm';
import { ChatMessageArea } from './ChatMessageArea';
import { useChatState } from '@/hooks/useChatState';
import { useChatListManagement } from '@/hooks/useChatListManagement';
import { useDiscourseIntegration } from '@/hooks/useDiscourseIntegration';
import { NegationEdge } from '../graph/NegationEdge';
import { PreviewStatementNode, PreviewStatementNodeData } from './PreviewStatementNode';
import { PreviewPointNode, PreviewPointNodeData } from './PreviewPointNode';
import { PreviewAddPointNode, PreviewAddPointNodeData } from './PreviewAddPointNode';
import {
    ReactFlow,
    ReactFlowProvider,
    useNodesState,
    useEdgesState,
    MiniMap,
    Controls,
    Background,
    Panel,
    BackgroundVariant,
    OnNodesChange,
    OnEdgesChange,
    NodeTypes,
    EdgeTypes,
    useReactFlow,
    Node,
    Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTheme } from "next-themes";
import { cn } from '@/lib/cn';
import { Button } from '../ui/button';
import { nanoid } from 'nanoid';
import { Save, Loader2, CheckCircle } from 'lucide-react';
import * as ContextMenu from '@radix-ui/react-context-menu';

import { ViewpointGraph } from '@/atoms/viewpointAtoms';
import { usePrivy } from '@privy-io/react-auth';
import { useUser } from '@/queries/useUser';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { AuthenticatedActionButton } from '../AuthenticatedActionButton';
import { fetchPointsByExactContent } from '@/actions/fetchPointsByExactContent';
import { DuplicatePointSelectionDialog, ConflictingPoint, ResolvedMappings } from './DuplicatePointSelectionDialog';
import { createRationaleFromPreview } from '@/actions/createRationaleFromPreview';
import { POINT_MIN_LENGTH, POINT_MAX_LENGTH } from '@/constants/config';
import { EditMessageDialog } from './EditMessageDialog';

type PreviewAppNode =
    | Node<PreviewStatementNodeData, 'statement'>
    | Node<PreviewPointNodeData, 'point'>
    | Node<PreviewAddPointNodeData, 'addPoint'>;
type PreviewAppEdge = Edge;

const nodeTypes: NodeTypes = {
    statement: PreviewStatementNode,
    point: PreviewPointNode,
    addPoint: PreviewAddPointNode,
};

const edgeTypes: EdgeTypes = {
    negation: NegationEdge,
};

const RationaleVisualFeed = ({ nodes, edges, onNodesChange, onEdgesChange, onSaveGraph, onDiscard, graphModified, isSaving, onCreateRationaleClick }: {
    nodes: PreviewAppNode[];
    edges: PreviewAppEdge[];
    onNodesChange: OnNodesChange<PreviewAppNode>;
    onEdgesChange: OnEdgesChange<PreviewAppEdge>;
    onSaveGraph: () => void;
    onDiscard: () => void;
    graphModified: boolean;
    isSaving: boolean;
    onCreateRationaleClick: () => void;
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
                parentId: targetId, // Only parentId needed for PreviewAddPointNode
            },
            position: {
                x: targetNode.position.x,
                y: targetNode.position.y + 150,
            },
        });

        reactFlowInstance.addEdges({
            id: `edge-${nanoid()}`,
            source: targetId,
            sourceHandle: `${targetId}-add-handle`,
            target: uniqueId,
            targetHandle: `${uniqueId}-target`,
            type: 'negation',
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
                                disabled={isSaving}
                                size="sm"
                                className="shadow-lg w-[160px]"
                            >
                                {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckCircle className="mr-2 h-4 w-4" />}
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
                            {/* Use Radix Context Menu Item */}
                            <ContextMenu.Item
                                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent focus:bg-accent hover:text-accent-foreground focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                onSelect={() => handleAddNegationClick(targetNodeId)}
                            >
                                Add Negation
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

interface RationaleCreatorProps {
    onClose: () => void;
    chatState: ReturnType<typeof useChatState>;
    chatList: ReturnType<typeof useChatListManagement>;
    discourse: ReturnType<typeof useDiscourseIntegration>;
    isAuthenticated: boolean;
    isInitializing: boolean;
    currentSpace: string | null;
    isMobile: boolean;
    showGraph: boolean;
    graphData: ViewpointGraph;
    onGraphChange: (newGraph: ViewpointGraph, immediateSave: boolean) => void;
    canvasEnabled: boolean;
    description: string;
    onDescriptionChange: (desc: string) => void;
    linkUrl?: string;
    onLinkUrlChange?: (url: string) => void;
}

export const RationaleCreator: React.FC<RationaleCreatorProps> = (props) => {
    return (
        <ReactFlowProvider>
            <RationaleCreatorInner {...props} />
        </ReactFlowProvider>
    );
};

const RationaleCreatorInner: React.FC<RationaleCreatorProps> = ({
    onClose,
    chatState,
    chatList,
    discourse,
    isAuthenticated,
    isInitializing,
    currentSpace,
    isMobile,
    showGraph,
    graphData,
    onGraphChange,
    canvasEnabled,
    description,
    linkUrl,
}) => {
    // State for editing messages
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
    const [editingMessageContent, setEditingMessageContent] = useState<string>("");
    const [persistedGraph, setPersistedGraph] = useState<ViewpointGraph>(graphData);
    const [nodes, setNodes, onNodesChangeReactFlow] = useNodesState<PreviewAppNode>(graphData.nodes as unknown as PreviewAppNode[]);
    const [edges, setEdges, onEdgesChangeReactFlow] = useEdgesState<PreviewAppEdge>(graphData.edges as unknown as PreviewAppEdge[]);
    const [graphModified, setGraphModified] = useState(false);
    const { pendingPushIds, currentChatId, savedChats } = chatList;
    const isSavingGraph = !!currentChatId && pendingPushIds.has(currentChatId);
    const { user: privyUser } = usePrivy();
    const { data: userData } = useUser(privyUser?.id);
    const router = useRouter();
    const reactFlowInstance = useReactFlow<PreviewAppNode, PreviewAppEdge>();
    const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
    const [conflictingPoints, setConflictingPoints] = useState<ConflictingPoint[]>([]);
    const [resolvedMappings, setResolvedMappings] = useState<ResolvedMappings>(new Map());
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        if (!graphData) return;

        const currentNodesMap = new Map(nodes.map(node => [node.id, node]));
        const incomingNodesMap = new Map(graphData.nodes.map(node => [node.id, node]));

        const verticalSpacing = 150;
        const estimatedNodeWidth = 280;
        const estimatedNodeHeight = 140;
        const horizontalGap = 40;
        const siblingGroupWidth = estimatedNodeWidth + horizontalGap;
        let orphanCascadeY = 50;
        const orphanCascadeX = -200;
        const collisionPadding = 15;
        const maxCollisionIterations = 8;

        const processedNodes: PreviewAppNode[] = graphData.nodes.map(incomingNode => {
            const existingNode = currentNodesMap.get(incomingNode.id) as PreviewAppNode | undefined;
            if (existingNode) {
                let finalNodeData: PreviewStatementNodeData | PreviewPointNodeData | PreviewAddPointNodeData = { ...(existingNode.data as any) };

                if (existingNode.type === 'point' && incomingNode.type === 'point') {
                    const incomingAsPreviewPointData = incomingNode.data as unknown as PreviewPointNodeData;
                    finalNodeData = {
                        content: incomingAsPreviewPointData.content,
                        cred: incomingAsPreviewPointData.cred !== undefined ? incomingAsPreviewPointData.cred : (existingNode.data as PreviewPointNodeData).cred,
                    };
                } else if (existingNode.type === 'statement' && incomingNode.type === 'statement') {
                    finalNodeData = { ...(incomingNode.data as unknown as PreviewStatementNodeData) };
                } else if (existingNode.type === 'addPoint' && incomingNode.type === 'addPoint') {
                    finalNodeData = { ...(incomingNode.data as unknown as PreviewAddPointNodeData) };
                } else if (existingNode.type !== incomingNode.type) {
                    if (incomingNode.type === 'point') finalNodeData = incomingNode.data as unknown as PreviewPointNodeData;
                    else if (incomingNode.type === 'statement') finalNodeData = incomingNode.data as unknown as PreviewStatementNodeData;
                    else if (incomingNode.type === 'addPoint') finalNodeData = incomingNode.data as unknown as PreviewAddPointNodeData;
                } else {
                    finalNodeData = { ...(incomingNode.data as any) };
                }

                return {
                    ...existingNode,
                    id: incomingNode.id,
                    type: incomingNode.type,
                    data: finalNodeData,
                    position: existingNode.position,
                } as PreviewAppNode;
            } else {
                let newNodeData: PreviewStatementNodeData | PreviewPointNodeData | PreviewAddPointNodeData;
                if (incomingNode.type === 'point') newNodeData = incomingNode.data as unknown as PreviewPointNodeData;
                else if (incomingNode.type === 'statement') newNodeData = incomingNode.data as unknown as PreviewStatementNodeData;
                else if (incomingNode.type === 'addPoint') newNodeData = incomingNode.data as unknown as PreviewAddPointNodeData;
                else newNodeData = { content: 'Unknown Type', cred: 0 } as PreviewPointNodeData;

                return {
                    id: incomingNode.id,
                    type: incomingNode.type as 'point' | 'statement' | 'addPoint',
                    data: newNodeData,
                    position: { x: NaN, y: NaN },
                } as PreviewAppNode;
            }
        });

        let nodesToLayout = processedNodes.filter(n => isNaN(n.position.x));
        const finalPositions = new Map<string, { x: number; y: number }>(
            processedNodes.filter(n => !isNaN(n.position.x)).map(n => [n.id, n.position])
        );

        let layoutIterations = 0;
        const MAX_HIERARCHICAL_ITERATIONS = nodesToLayout.length + 5;

        while (nodesToLayout.length > 0 && layoutIterations < MAX_HIERARCHICAL_ITERATIONS) {
            let positionedThisIteration = 0;
            const nextNodesToLayout = [];

            for (const node of nodesToLayout) {
                const edgeToThisNode = graphData.edges.find(edge => edge.target === node.id);

                if (!edgeToThisNode || !incomingNodesMap.has(edgeToThisNode.source)) {
                    finalPositions.set(node.id, { x: orphanCascadeX, y: orphanCascadeY });
                    orphanCascadeY += verticalSpacing * 0.75;
                    positionedThisIteration++;
                } else {
                    const parentId = edgeToThisNode.source;
                    if (finalPositions.has(parentId)) {
                        const parentPosition = finalPositions.get(parentId)!;

                        const siblingNodesInLayoutPass = nodesToLayout.filter(sibling => {
                            const edgeToSibling = graphData.edges.find(e => e.target === sibling.id);
                            return edgeToSibling && edgeToSibling.source === parentId;
                        });

                        const numSiblings = siblingNodesInLayoutPass.length;
                        const totalWidth = (numSiblings * estimatedNodeWidth) + Math.max(0, numSiblings - 1) * horizontalGap;
                        const startX = parentPosition.x - totalWidth / 2 + estimatedNodeWidth / 2;

                        siblingNodesInLayoutPass.forEach((sibling, index) => {
                            const posX = startX + index * siblingGroupWidth;
                            const posY = parentPosition.y + verticalSpacing;
                            finalPositions.set(sibling.id, { x: posX, y: posY });
                            positionedThisIteration++;
                        });
                    } else {
                        nextNodesToLayout.push(node);
                    }
                }
            }
            nodesToLayout = nextNodesToLayout.filter(n => !finalPositions.has(n.id));
            layoutIterations++;
            if (positionedThisIteration === 0 && nodesToLayout.length > 0) {
                nodesToLayout.forEach(n => {
                    if (!finalPositions.has(n.id)) {
                        finalPositions.set(n.id, { x: orphanCascadeX, y: orphanCascadeY });
                        orphanCascadeY += verticalSpacing * 0.75;
                    }
                });
                break;
            }
        }

        let layoutAppliedNodes: PreviewAppNode[] = processedNodes.map(node => ({
            ...node,
            position: finalPositions.get(node.id) || node.position,
        })).filter(node => incomingNodesMap.has(node.id));

        // --- Collision Avoidance Pass ---
        for (let iter = 0; iter < maxCollisionIterations; iter++) {
            let collisionsFoundThisIteration = false;
            for (let i = 0; i < layoutAppliedNodes.length; i++) {
                for (let j = i + 1; j < layoutAppliedNodes.length; j++) {
                    const nodeA = layoutAppliedNodes[i];
                    const nodeB = layoutAppliedNodes[j];

                    const effectiveWidthA = (nodeA.width || estimatedNodeWidth) + collisionPadding;
                    const effectiveHeightA = (nodeA.height || estimatedNodeHeight) + collisionPadding;
                    const effectiveWidthB = (nodeB.width || estimatedNodeWidth) + collisionPadding;
                    const effectiveHeightB = (nodeB.height || estimatedNodeHeight) + collisionPadding;

                    const centerAx = nodeA.position.x + effectiveWidthA / 2;
                    const centerAy = nodeA.position.y + effectiveHeightA / 2;
                    const centerBx = nodeB.position.x + effectiveWidthB / 2;
                    const centerBy = nodeB.position.y + effectiveHeightB / 2;

                    const dx = centerAx - centerBx;
                    const dy = centerAy - centerBy;

                    const minDistanceX = (effectiveWidthA / 2) + (effectiveWidthB / 2);
                    const minDistanceY = (effectiveHeightA / 2) + (effectiveHeightB / 2);

                    const overlapX = minDistanceX - Math.abs(dx);
                    const overlapY = minDistanceY - Math.abs(dy);

                    if (overlapX > 0 && overlapY > 0) {
                        collisionsFoundThisIteration = true;
                        const pushFactor = 0.3; // Reduced pushFactor for gentler adjustment

                        if (overlapX < overlapY) { // Push less overlapping axis first or more, depending on strategy
                            const push = (dx < 0 ? -overlapX : overlapX) * pushFactor;
                            nodeA.position = { ...nodeA.position, x: nodeA.position.x + push / 2 };
                            nodeB.position = { ...nodeB.position, x: nodeB.position.x - push / 2 };
                        } else {
                            const push = (dy < 0 ? -overlapY : overlapY) * pushFactor;
                            nodeA.position = { ...nodeA.position, y: nodeA.position.y + push / 2 };
                            nodeB.position = { ...nodeB.position, y: nodeB.position.y - push / 2 };
                        }
                    }
                }
            }
            if (!collisionsFoundThisIteration) break;
        }

        // --- Final Check & Update React Flow State ---
        const stringifyNodeForCompare = (n: PreviewAppNode) => JSON.stringify({ id: n.id, x: n.position.x, y: n.position.y, data: n.data, type: n.type });
        const stringifyEdgeForCompare = (e: PreviewAppEdge) => JSON.stringify({ id: e.id, source: e.source, target: e.target, type: e.type });

        const currentNodesComparable = nodes.map(stringifyNodeForCompare).sort().join(',');
        const finalNodesComparable = layoutAppliedNodes.map(stringifyNodeForCompare).sort().join(',');
        const areNodesEqual = currentNodesComparable === finalNodesComparable;

        const currentEdgesComparable = edges.map(stringifyEdgeForCompare).sort().join(',');
        const finalEdgesComparable = graphData.edges.map(stringifyEdgeForCompare).sort().join(',');
        const areEdgesEqual = currentEdgesComparable === finalEdgesComparable;

        let nodesActuallyChanged = false;
        if (!areNodesEqual) {
            setNodes(layoutAppliedNodes);
            nodesActuallyChanged = true;
        }

        let edgesActuallyChanged = false;
        if (!areEdgesEqual) {
            setEdges(graphData.edges as PreviewAppEdge[]);
            edgesActuallyChanged = true;
        }

        if ((nodesActuallyChanged || edgesActuallyChanged) && reactFlowInstance) {
            requestAnimationFrame(() => {
                reactFlowInstance.fitView({ duration: 600, padding: 0.15 });
            });
        }
        //eslint-disable-next-line react-hooks/exhaustive-deps
    }, [graphData, reactFlowInstance, setNodes, setEdges]);

    // When nodes change, mark the graph as modified
    const handleNodesChange: OnNodesChange<PreviewAppNode> = useCallback((changes) => {
        onNodesChangeReactFlow(changes);
        setGraphModified(true);
    }, [onNodesChangeReactFlow]);

    // When edges change, mark the graph as modified
    const handleEdgesChange: OnEdgesChange<PreviewAppEdge> = useCallback((changes) => {
        onEdgesChangeReactFlow(changes);
        setGraphModified(true);
    }, [onEdgesChangeReactFlow]);

    // Save: update persisted and push
    const saveGraph = useCallback(() => {
        const currentGraph: ViewpointGraph = { nodes: nodes as any, edges: edges as any };
        // Persist to parent and update baseline
        setPersistedGraph(currentGraph);
        onGraphChange(currentGraph, true); // Pass true for immediate save
        chatState.currentGraphRef.current = currentGraph;
        setGraphModified(false);
    }, [nodes, edges, onGraphChange, chatState]);

    // Discard: revert edits to persisted
    const discardGraph = useCallback(() => {
        setNodes(persistedGraph.nodes as unknown as PreviewAppNode[]);
        setEdges(persistedGraph.edges as unknown as PreviewAppEdge[]);
        setGraphModified(false);
    }, [persistedGraph, setNodes, setEdges]);

    // Handle form submission
    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (chatState.generatingChats.has(chatList.currentChatId || '')) return;

        if (graphModified) {
            toast.error("Graph has unsaved changes. Save manually, or use Ctrl+Enter / Ctrl+Click on send to auto-save and send.", {
                action: {
                    label: "Save Changes",
                    onClick: saveGraph,
                },
                duration: 5000,
            });
            return;
        }

        if (e.type === 'submit' || (e.nativeEvent && (e.nativeEvent as SubmitEvent).type === 'submit')) {
            chatState.handleSubmit(e as React.FormEvent<HTMLFormElement>);
        } else {
            chatState.handleSubmit();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (chatState.message.trim() && !chatState.generatingChats.has(chatList.currentChatId || '')) {
                if (graphModified) {
                    if (e.ctrlKey || e.metaKey) {
                        saveGraph();
                        chatState.handleSubmit();
                    } else {
                        toast.error("Graph has unsaved changes. Save manually, or use Ctrl+Enter / Ctrl+Click on send to auto-save and send.", {
                            action: {
                                label: "Save Changes",
                                onClick: saveGraph,
                            },
                            duration: 5000,
                        });
                    }
                    return;
                }
                chatState.handleSubmit();
            }
        }
    };

    const handleTriggerEdit = (index: number, content: string) => {
        setEditingMessageIndex(index);
        setEditingMessageContent(content);
        setShowEditDialog(true);
    };

    const handleCreateRationale = useCallback(async (useResolvedMappings = false) => {
        if (!isAuthenticated || !currentSpace || !privyUser || !userData || !reactFlowInstance) {
            toast.error("Cannot create rationale: Missing user data or context.");
            return;
        }

        const currentNodes = reactFlowInstance.getNodes();
        const currentEdges = reactFlowInstance.getEdges();
        console.log('handleCreateRationale called. Nodes:', currentNodes, 'Edges:', currentEdges);
        console.log('Persisted graph (baseline):', persistedGraph);
        console.log('Current state var nodes:', nodes);
        console.log('Current state var edges:', edges);

        setIsCreating(true);

        // --- 0. Point Length Check ---
        const pointNodes = currentNodes.filter(node => node.type === 'point') as Node<PreviewPointNodeData>[];
        for (const node of pointNodes) {
            const contentLength = node.data.content.length;
            if (contentLength < POINT_MIN_LENGTH || contentLength > POINT_MAX_LENGTH) {
                toast.error(
                    `Point content length invalid (must be ${POINT_MIN_LENGTH}-${POINT_MAX_LENGTH} chars): "${node.data.content.length > 50 ? node.data.content.substring(0, 47) + '...' : node.data.content
                    }"`
                );
                setIsCreating(false);
                return;
            }
        }

        // --- 1. Cred Check ---
        let totalRequiredCred = 0;
        pointNodes.forEach(node => {
            totalRequiredCred += node.data.cred || 0;
        });

        const userCred = userData.cred ?? 0;
        if (totalRequiredCred > userCred) {
            toast.error(`Insufficient cred to create rationale. Required: ${totalRequiredCred}, Available: ${userCred}`);
            setIsCreating(false);
            return;
        }

        // --- 2. Duplicate Point Check ---
        let mappingsForAction = resolvedMappings;
        if (!useResolvedMappings) {
            const uniqueContentStrings = Array.from(new Set(pointNodes.map(node => node.data.content).filter(Boolean)));

            let existingPoints: { id: number; content: string }[] = [];
            if (uniqueContentStrings.length > 0) {
                try {
                    existingPoints = await fetchPointsByExactContent(uniqueContentStrings, currentSpace);
                } catch (error) {
                    toast.error("Failed to check for existing points. Please try again.");
                    console.error("[handleCreateRationale] Error fetching existing points:", error);
                    setIsCreating(false);
                    return;
                }
            }

            const contentToExistingPointsMap = new Map<string, { id: number; content: string }[]>();
            existingPoints.forEach(p => {
                const points = contentToExistingPointsMap.get(p.content) || [];
                points.push(p);
                contentToExistingPointsMap.set(p.content, points);
            });

            const conflicts: ConflictingPoint[] = pointNodes
                .map(node => ({
                    previewNodeId: node.id,
                    content: node.data.content,
                    existingPoints: contentToExistingPointsMap.get(node.data.content) || []
                }))
                .filter(conflict => conflict.existingPoints.length > 0);

            if (conflicts.length > 0) {
                setConflictingPoints(conflicts);
                setIsDuplicateDialogOpen(true);
                setIsCreating(false);
                return;
            }
            mappingsForAction = new Map<string, number | null>();
        }

        console.log("Pre-checks passed. Required Cred:", totalRequiredCred);
        console.log("Resolved Mappings:", mappingsForAction);
        toast.info("Creating rationale...");

        // --- 3. Extract Title/Description ---
        const statementNode = currentNodes.find(n => n.type === 'statement') as Node<PreviewStatementNodeData> | undefined;
        const rationaleTitle = statementNode?.data?.statement || 'Untitled Rationale';
        const rationaleDescription = description || '';

        // --- 4. Call Server Action ---
        try {
            const result = await createRationaleFromPreview({
                userId: privyUser.id,
                spaceId: currentSpace,
                title: rationaleTitle,
                description: rationaleDescription,
                nodes: currentNodes,
                edges: reactFlowInstance.getEdges(),
                resolvedMappings: mappingsForAction,
            });

            // --- 5. Handle Result ---
            if (result.success && result.rationaleId) {
                toast.success("Rationale created successfully!");
                router.push(`/s/${currentSpace}/rationale/${result.rationaleId}`);
            } else {
                toast.error(`Failed to create rationale: ${result.error || 'Unknown error'}`);
            }
        } catch (error: any) {
            toast.error(`An error occurred: ${error.message || 'Please try again'}`);
            console.error("[handleCreateRationale] Action call failed:", error);
        } finally {
            setIsCreating(false);
        }

    }, [isAuthenticated, currentSpace, privyUser, userData, reactFlowInstance, router, resolvedMappings, description, edges, nodes, persistedGraph]);

    const handleResolveDuplicates = (mappings: ResolvedMappings) => {
        setResolvedMappings(mappings);
        setIsDuplicateDialogOpen(false);
        handleCreateRationale(true);
    };

    useEffect(() => {
        const initDesc = graphData.description || '';
        const initLink = (graphData as any).linkUrl || '';
        if ((description !== initDesc || linkUrl !== initLink) && !graphModified) {
            setGraphModified(true);
        }
    }, [description, linkUrl, graphData, graphModified]);

    return (
        <div className="flex flex-1 overflow-hidden h-full">
            {/* Chat Area Container */}
            <div
                className={cn(
                    "flex flex-col overflow-hidden transition-all duration-300 ease-in-out h-full",
                    isMobile && canvasEnabled && "w-0 opacity-0 pointer-events-none",
                    isMobile && !canvasEnabled && "w-full",
                    !isMobile && !showGraph && "w-full",
                    !isMobile && showGraph && "w-1/3 border-r"
                )}
            >
                <ChatMessageArea
                    isInitializing={isInitializing}
                    isFetchingRationales={false}
                    chatState={chatState}
                    isGeneratingCurrent={chatState.generatingChats.has(chatList.currentChatId || '')}
                    isFetchingCurrentContext={chatState.fetchingContextChats.has(chatList.currentChatId || '')}
                    currentStreamingContent={chatState.streamingContents.get(chatList.currentChatId || '') || ''}
                    chatList={chatList}
                    discourse={discourse}
                    isAuthenticated={isAuthenticated}
                    userRationales={[]}
                    availableRationales={[]}
                    currentSpace={currentSpace}
                    isMobile={isMobile}
                    initialOptions={[]}
                    onStartChatOption={() => { }}
                    onTriggerEdit={handleTriggerEdit}
                />
                <ChatInputForm
                    message={chatState.message}
                    setMessage={chatState.setMessage}
                    isGenerating={chatState.generatingChats.has(chatList.currentChatId || '')}
                    isAuthenticated={isAuthenticated}
                    isInitializing={isInitializing}
                    isMobile={isMobile}
                    currentSpace={currentSpace}
                    onSubmit={handleFormSubmit}
                    onKeyDown={handleKeyDown}
                    onShowSettings={() => { /* Maybe disable settings here? */ }}
                    hideSettings={true}
                    graphModified={graphModified}
                    saveGraph={saveGraph}
                />
            </div>

            {/* Graph Area Container */}
            <div
                className={cn(
                    "flex-1 overflow-hidden h-full transition-all duration-300 ease-in-out",
                    isMobile && canvasEnabled && "w-full",
                    isMobile && !canvasEnabled && "w-0 opacity-0 pointer-events-none",
                    !isMobile && showGraph && "opacity-100",
                    !isMobile && !showGraph && "opacity-0 w-0 pointer-events-none"
                )}
            >
                {((isMobile && canvasEnabled) || (!isMobile && showGraph)) && (
                    <RationaleVisualFeed
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={handleNodesChange}
                        onEdgesChange={handleEdgesChange}
                        onSaveGraph={saveGraph}
                        onDiscard={discardGraph}
                        graphModified={graphModified}
                        isSaving={isSavingGraph}
                        onCreateRationaleClick={handleCreateRationale}
                    />
                )}
            </div>
            <DuplicatePointSelectionDialog
                isOpen={isDuplicateDialogOpen}
                onOpenChange={setIsDuplicateDialogOpen}
                conflicts={conflictingPoints}
                onResolve={handleResolveDuplicates}
            />
            {/* Edit Message Dialog */}
            <EditMessageDialog
                open={showEditDialog}
                onOpenChange={(open) => {
                    if (!open) {
                        setShowEditDialog(false);
                        setEditingMessageIndex(null);
                        setEditingMessageContent("");
                    }
                }}
                initialContent={editingMessageContent}
                onSave={(newContent) => {
                    if (editingMessageIndex !== null) {
                        chatState.handleSaveEdit(editingMessageIndex, newContent);
                    }
                }}
            />
        </div>
    );
}; 