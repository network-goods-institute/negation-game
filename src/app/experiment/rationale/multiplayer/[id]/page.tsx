'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { usePrivy } from '@privy-io/react-auth';
import { useUser } from '@/queries/users/useUser';

import { CursorOverlay } from '@/components/experiment/multiplayer/CursorOverlay';
import { CursorReporter } from '@/components/experiment/multiplayer/CursorReporter';
import { ConnectedUsers } from '@/components/experiment/multiplayer/ConnectedUsers';
import { useYjsMultiplayer } from '@/hooks/experiment/multiplayer/useYjsMultiplayer';
import { useMultiplayerCursors } from '@/hooks/experiment/multiplayer/useMultiplayerCursors';
import { createGraphChangeHandlers, createNodeDragHandler } from '@/utils/experiment/multiplayer/graphSync';
import { nodeTypes, edgeTypes } from '@/data/experiment/multiplayer/sampleData';
import { GraphProvider } from '@/components/experiment/multiplayer/GraphContext';
import { generateEdgeId } from '@/utils/experiment/multiplayer/graphSync';
import { GraphUpdater } from '@/components/experiment/multiplayer/GraphUpdater';

export default function MultiplayerRationaleDetailPage() {
    const routeParams = useParams<{ id: string }>();
    const { authenticated, ready, login } = usePrivy();
    const { data: user, isLoading: isUserLoading, isFetching: isUserFetching } = useUser();

    const [userColor, setUserColor] = useState<string>("#3b82f6");
    const [initialGraph, setInitialGraph] = useState<{ nodes: any[]; edges: any[] } | null>(null);
    const [connectMode, setConnectMode] = useState<boolean>(false);
    const [connectAnchorId, setConnectAnchorId] = useState<string | null>(null);
    const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
    const lastAddRef = useRef<Record<string, number>>({});

    useEffect(() => {
        const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
        setUserColor(colors[Math.floor(Math.random() * colors.length)]);
    }, []);

    useEffect(() => {
        const id = String(routeParams?.id || "");
        const statementId = 'statement';
        const pointId = `p-${Date.now()}`;
        setInitialGraph({
            nodes: [
                { id: statementId, type: 'statement', position: { x: 250, y: 200 }, data: { statement: 'New Rationale' } },
                { id: pointId, type: 'point', position: { x: 250, y: 360 }, data: { content: 'First point' } },
            ],
            edges: [
                { id: generateEdgeId(), type: 'statement', source: pointId, target: statementId, sourceHandle: `${pointId}-source-handle`, targetHandle: `${statementId}-incoming-handle` },
            ],
        });
    }, [routeParams]);

    const username = user?.username || 'Anonymous';

    const roomName = useMemo(() => {
        const id = typeof routeParams?.id === 'string' ? routeParams.id : String(routeParams?.id || '');
        return `rationale:${id}`;
    }, [routeParams]);

    const {
        nodes,
        edges,
        setNodes,
        setEdges,
        provider,
        ydoc,
        yNodesMap,
        yEdgesMap,
        syncYMapFromArray,
        connectionError,
        isConnected,
    } = useYjsMultiplayer({
        roomName,
        initialNodes: initialGraph?.nodes || [],
        initialEdges: initialGraph?.edges || [],
        enabled: ready && !isUserLoading && !isUserFetching && Boolean(initialGraph),
    });

    const cursors = useMultiplayerCursors({
        provider,
        username,
        userColor,
    });

    const { onNodesChange, onEdgesChange, onConnect } = createGraphChangeHandlers(
        setNodes,
        setEdges,
        yNodesMap,
        yEdgesMap,
        ydoc,
        syncYMapFromArray
    );

    const handleNodeDrag = createNodeDragHandler(setNodes, username);

    const updateEdgeAnchorPosition = useCallback((edgeId: string, x: number, y: number) => {
        setNodes((nds) => {
            let changed = false;
            const updated = nds.map((n: any) => {
                if (!(n.type === 'edge_anchor' && n.data?.parentEdgeId === edgeId)) return n;
                if (Math.abs(n.position.x - x) < 0.25 && Math.abs(n.position.y - y) < 0.25) return n;
                changed = true;
                return { ...n, position: { x, y } };
            });
            return changed ? updated : nds;
        });
        if (yNodesMap && ydoc) {
            // Only update local for responsiveness; Yjs sync can be added if needed later
        }
    }, [setNodes]);



    if (!ready || (authenticated && (isUserLoading || isUserFetching))) {
        return (
            <div className="fixed inset-0 top-16 bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!authenticated) {
        return (
            <div className="fixed inset-0 top-16 bg-gray-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-lg border text-center max-w-md">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">
                        Login Required
                    </h1>
                    <p className="text-gray-600 mb-6">
                        You need to be logged in to access the multiplayer rationale system.
                    </p>
                    <button
                        onClick={login}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                        Login
                    </button>
                </div>
            </div>
        );
    }

    const updateNodeContent = (nodeId: string, content: string) => {
        setNodes((nds) => nds.map((n) => n.id === nodeId ? ({ ...n, data: n.type === 'statement' ? { ...n.data, statement: content } : { ...n.data, content } }) : n));
        if (yNodesMap && ydoc) ydoc.transact(() => yNodesMap.set(nodeId, (yNodesMap.get(nodeId) ? { ...(yNodesMap.get(nodeId) as any), data: (yNodesMap.get(nodeId) as any).type === 'statement' ? { ...(yNodesMap.get(nodeId) as any).data, statement: content } : { ...(yNodesMap.get(nodeId) as any).data, content } } : (null as any))), 'node-edit');
    };

    const addNegationBelow = (parentNodeId: string) => {
        const now = Date.now();
        const last = lastAddRef.current[parentNodeId] || 0;
        if (now - last < 500) return;
        lastAddRef.current[parentNodeId] = now;
        const parent = nodes.find((n: any) => n.id === parentNodeId);
        if (!parent) return;
        const newId = `p-${now}-${Math.floor(Math.random() * 1e6)}`;
        const newPos = { x: parent.position.x, y: parent.position.y + 180 };
        const newNode: any = { id: newId, type: 'point', position: newPos, data: { content: 'New point' } };
        const edgeType = parent.type === 'statement' ? 'statement' : 'negation';
        const newEdge: any = { id: generateEdgeId(), type: edgeType, source: newId, target: parentNodeId, sourceHandle: `${newId}-source-handle`, targetHandle: `${parentNodeId}-incoming-handle` };
        if (yNodesMap && yEdgesMap && ydoc) {
            ydoc.transact(() => { yNodesMap.set(newId, newNode); yEdgesMap.set(newEdge.id, newEdge); }, 'add-child');
        } else {
            setNodes((curr) => [...curr, newNode]);
            setEdges((eds) => [...eds, newEdge]);
        }
    };

    const addObjectionForEdge = (edgeId: string, overrideMidX?: number, overrideMidY?: number) => {
        console.log('addObjectionForEdge called with:', edgeId);
        console.log('Current edges:', edges);
        console.log('Current nodes:', nodes);

        const base = edges.find((e: any) => e.id === edgeId);
        if (!base) {
            console.log('Base edge not found!');
            return;
        }
        console.log('Found base edge:', base);

        const src = nodes.find((n: any) => n.id === base.source);
        const tgt = nodes.find((n: any) => n.id === base.target);
        if (!src || !tgt) return;
        const midX = overrideMidX ?? ((src.position.x + tgt.position.x) / 2);
        const midY = overrideMidY ?? ((src.position.y + tgt.position.y) / 2);

        const anchorId = `ea-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
        const objectionId = `o-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

        const anchorNode: any = { id: anchorId, type: 'edge_anchor', position: { x: midX, y: midY }, data: { parentEdgeId: edgeId } };
        const objectionNode: any = { id: objectionId, type: 'objection', position: { x: midX, y: midY + 60 }, data: { content: 'New objection', parentEdgeId: edgeId } };

        const objectionEdge: any = {
            id: generateEdgeId(),
            type: 'objection',
            source: objectionId,
            target: anchorId
        };

        console.log('Creating nodes and edge:', { anchorNode, objectionNode, objectionEdge });
        console.log('Objection edge details:', {
            id: objectionEdge.id,
            type: objectionEdge.type,
            source: objectionEdge.source,
            target: objectionEdge.target
        });

        // Always update local state immediately for responsiveness
        console.log('Updating local state immediately');

        // Batch updates but avoid recursive setState chains
        setNodes((nds) => {
            const newNodes = [...nds, anchorNode, objectionNode];
            console.log('Local nodes update:', newNodes.length);
            return newNodes;
        });
        setEdges((eds) => {
            const newEdges = [...eds, objectionEdge];
            console.log('Local edges update:', newEdges.length);
            return newEdges;
        });

        // Also sync to Yjs if available
        if (yNodesMap && yEdgesMap && ydoc) {
            console.log('Also syncing to Yjs');
            ydoc.transact(() => {
                yNodesMap.set(anchorId, anchorNode);
                yNodesMap.set(objectionId, objectionNode);
                yEdgesMap.set(objectionEdge.id, objectionEdge);
            }, 'edge-objection-add');
        }
    };



    return (
        <div className="fixed inset-0 top-16 bg-gray-50">
            <div className="absolute top-4 left-4 z-10 bg-white p-4 rounded-lg shadow-lg border">
                <h1 className="text-xl font-bold text-gray-900 mb-2">
                    Multiplayer Rationale
                </h1>
                <p className="text-sm text-gray-600">
                    You are: <span className="font-semibold" style={{ color: userColor }}>{username}</span>
                </p>
                <ConnectedUsers provider={provider} isConnected={isConnected} />
                {connectionError && (
                    <p className="text-xs text-orange-600 mt-1 bg-orange-50 p-2 rounded">
                        {connectionError}
                    </p>
                )}
            </div>

            <ReactFlowProvider>
                <GraphProvider value={{
                    updateNodeContent,
                    addNegationBelow,
                    beginConnectFromNode: (id: string) => setConnectAnchorId(id),
                    cancelConnect: () => setConnectAnchorId(null),
                    isConnectingFromNodeId: connectAnchorId,
                    addObjectionForEdge,
                    hoveredEdgeId,
                    setHoveredEdge: setHoveredEdgeId,
                    updateEdgeAnchorPosition,
                }}>
                    <div className="w-full h-full relative">
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onInit={() => console.log('ReactFlow initialized with edges:', edges)}
                            onNodesChange={authenticated ? onNodesChange : undefined}
                            onEdgesChange={authenticated ? onEdgesChange : undefined}
                            onConnect={authenticated ? onConnect : undefined}
                            onNodeClick={(e, node) => {
                                if (!connectMode) return;
                                e.stopPropagation();
                                if (!connectAnchorId) {
                                    setConnectAnchorId(node.id);
                                    return;
                                }
                                if (node.id === connectAnchorId) {
                                    setConnectAnchorId(null);
                                    return;
                                }
                                const parentId = connectAnchorId;
                                const childId = node.id;
                                const parentType = nodes.find((n: any) => n.id === parentId)?.type;
                                const edgeType = parentType === 'statement' ? 'statement' : 'negation';
                                const exists = edges.some((edge: any) => edge.source === childId && edge.target === parentId && edge.type === edgeType);
                                if (!exists) {
                                    const newEdge: any = { id: generateEdgeId(), type: edgeType, source: childId, target: parentId, sourceHandle: `${childId}-source-handle`, targetHandle: `${parentId}-incoming-handle` };
                                    if (yEdgesMap && ydoc) {
                                        ydoc.transact(() => yEdgesMap.set(newEdge.id, newEdge), 'edge-connect');
                                    } else {
                                        setEdges((eds) => [...eds, newEdge]);
                                    }
                                }
                                setConnectAnchorId(null);
                            }}
                            onNodeDrag={authenticated ? handleNodeDrag : undefined}
                            nodeTypes={nodeTypes}
                            edgeTypes={edgeTypes}
                            fitView
                            className="w-full h-full bg-gray-50"
                            onEdgeMouseEnter={(_, edge) => setHoveredEdgeId(edge.id)}
                            onEdgeMouseLeave={() => setHoveredEdgeId(null)}
                        >
                            <Background />
                            <Controls />
                            <MiniMap
                                nodeColor={() => '#dbeafe'}
                                className="bg-white"
                            />
                        </ReactFlow>
                        {authenticated && <CursorOverlay cursors={cursors} />}
                        {authenticated && (
                            <CursorReporter
                                provider={provider}
                                username={username}
                                userColor={userColor}
                            />
                        )}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
                            <div className="bg-white/95 backdrop-blur border shadow-xl rounded-full px-3 py-1.5 flex items-center gap-3">
                                <span className="text-xs text-stone-600 px-1">Tools</span>
                                <button
                                    onClick={() => {
                                        setConnectMode((v) => !v);
                                        setConnectAnchorId(null);
                                    }}
                                    className={`text-xs rounded-full px-3 py-1 transition-colors ${connectMode ? 'bg-blue-600 text-white' : 'bg-stone-800 text-white'}`}
                                >
                                    {connectMode ? 'Connecting' : 'Connect'}
                                </button>
                                {connectMode && (
                                    <>
                                        <span className="text-xs text-stone-600">
                                            {connectAnchorId ? `From selected. Now click a child` : 'Click a parent node'}
                                        </span>
                                        <button
                                            onClick={() => setConnectAnchorId(null)}
                                            className="text-xs rounded-full px-2 py-1 bg-stone-200 text-stone-800"
                                        >
                                            Reset
                                        </button>
                                        <button
                                            onClick={() => { setConnectMode(false); setConnectAnchorId(null); }}
                                            className="text-xs rounded-full px-2 py-1 bg-red-600 text-white"
                                        >
                                            Cancel
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <GraphUpdater nodes={nodes} edges={edges} setNodes={setNodes} />
                </GraphProvider>
            </ReactFlowProvider>
        </div>
    );
}


