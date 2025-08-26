'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { ReactFlowProvider, } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { usePrivy } from '@privy-io/react-auth';
import { useUser } from '@/queries/users/useUser';

import { MultiplayerHeader } from '@/components/experiment/multiplayer/MultiplayerHeader';
import { ToolsBar } from '@/components/experiment/multiplayer/ToolsBar';
import { GraphCanvas } from '@/components/experiment/multiplayer/GraphCanvas';
import { useYjsMultiplayer } from '@/hooks/experiment/multiplayer/useYjsMultiplayer';
import { useMultiplayerCursors } from '@/hooks/experiment/multiplayer/useMultiplayerCursors';
import { useMultiplayerEditing } from '@/hooks/experiment/multiplayer/useMultiplayerEditing';
import { useLeaderElection } from '@/hooks/experiment/multiplayer/useLeaderElection';
import { createGraphChangeHandlers } from '@/utils/experiment/multiplayer/graphSync';
import { GraphProvider } from '@/components/experiment/multiplayer/GraphContext';
import { generateEdgeId, deterministicEdgeId } from '@/utils/experiment/multiplayer/graphSync';
import { GraphUpdater } from '@/components/experiment/multiplayer/GraphUpdater';
import { toast } from 'sonner';

export default function MultiplayerRationaleDetailPage() {
    const routeParams = useParams<{ id: string }>();
    const { authenticated, ready, login } = usePrivy();
    const { data: user, isLoading: isUserLoading, isFetching: isUserFetching } = useUser();

    const [userColor, setUserColor] = useState<string>("#3b82f6");
    const [initialGraph, setInitialGraph] = useState<{ nodes: any[]; edges: any[] } | null>(null);
    const [connectMode, setConnectMode] = useState<boolean>(false);
    const [connectAnchorId, setConnectAnchorId] = useState<string | null>(null);
    const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
    const localOriginRef = useRef<object>({});
    const lastAddRef = useRef<Record<string, number>>({});
    const isDraggingRef = useRef<boolean>(false);

    useEffect(() => {
        const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
        const idBasis = (user?.id || 'anon') as string;
        let h = 0;
        for (let i = 0; i < idBasis.length; i++) h = (h * 31 + idBasis.charCodeAt(i)) >>> 0;
        setUserColor(colors[h % colors.length]);
    }, [user?.id]);

    const seededRef = useRef(false);
    useEffect(() => {
        if (seededRef.current) return;
        seededRef.current = true;
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
    }, []);

    const username = user?.username || 'Anonymous';
    const userId = (user as any)?.id || '';

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
        yTextMap,
        syncYMapFromArray,
        connectionError,
        isConnected,
        isSaving,
        undo,
        redo,
        canUndo,
        canRedo,
    } = useYjsMultiplayer({
        roomName,
        initialNodes: initialGraph?.nodes || [],
        initialEdges: initialGraph?.edges || [],
        enabled: ready && !isUserLoading && !isUserFetching && Boolean(initialGraph),
        localOrigin: localOriginRef.current,
    });

    const cursors = useMultiplayerCursors({ provider, userId, username, userColor });
    const { isLeader } = useLeaderElection(provider, userId);

    const { startEditing, stopEditing, getEditorsForNode, lockNode, unlockNode, isLockedForMe, getLockOwner } = useMultiplayerEditing({ provider, userId, username, userColor });

    const { onNodesChange, onEdgesChange, onConnect, commitNodePositions } = createGraphChangeHandlers(
        setNodes,
        setEdges,
        isLeader ? yNodesMap : null,
        isLeader ? yEdgesMap : null,
        isLeader ? ydoc : null,
        syncYMapFromArray,
        localOriginRef.current
    );

    const handleNodeDragStart = useCallback((_: any, node: any) => {
        if (isLockedForMe?.(node.id)) {
            const owner = getLockOwner?.(node.id);
            toast.warning(`Locked by ${owner?.name || 'another user'}`);
            return;
        }
        isDraggingRef.current = true;
        lockNode(node.id, 'drag');
    }, [lockNode, isLockedForMe, getLockOwner]);

    const handleNodeDragStop = useCallback((_: any, node: any) => {
        isDraggingRef.current = false;
        setTimeout(() => {
            unlockNode(node.id);
        }, 150);
    }, [unlockNode]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const isMod = e.metaKey || e.ctrlKey;
            if (!isMod) return;
            const key = e.key.toLowerCase();
            if (key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    redo?.();
                } else {
                    undo?.();
                }
            } else if (key === 'y') {
                e.preventDefault();
                redo?.();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [undo, redo]);

    const updateEdgeAnchorPositionRef = useRef<(edgeId: string, x: number, y: number) => void>(() => { });
    updateEdgeAnchorPositionRef.current = (edgeId: string, x: number, y: number) => {
        setNodes((nds) => {
            let changed = false;
            const updated = nds.map((n: any) => {
                if (!(n.type === 'edge_anchor' && n.data?.parentEdgeId === edgeId)) return n;
                // Only tiny threshold to prevent exact duplicate positions, not visible movement
                if (Math.abs(n.position.x - x) < 0.01 && Math.abs(n.position.y - y) < 0.01) return n;
                changed = true;
                return { ...n, position: { x, y } };
            });
            return changed ? updated : nds;
        });
    };

    const updateEdgeAnchorPosition = useCallback((edgeId: string, x: number, y: number) => {
        updateEdgeAnchorPositionRef.current?.(edgeId, x, y);
    }, []);



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
        if (yTextMap && ydoc && isLeader) {
            ydoc.transact(() => {
                let t = yTextMap.get(nodeId);
                if (!t) {
                    t = new (require('yjs').Text)();
                    if (t) {
                        yTextMap.set(nodeId, t);
                    }
                }
                if (t) {
                    const curr = t.toString();
                    if (curr === content) return;
                    let start = 0;
                    while (start < curr.length && start < content.length && curr[start] === content[start]) start++;
                    let endCurr = curr.length - 1;
                    let endNew = content.length - 1;
                    while (endCurr >= start && endNew >= start && curr[endCurr] === content[endNew]) { endCurr--; endNew--; }
                    const deleteLen = Math.max(0, endCurr - start + 1);
                    // eslint-disable-next-line drizzle/enforce-delete-with-where
                    if (deleteLen > 0) t.delete(start, deleteLen);
                    const insertText = content.slice(start, endNew + 1);
                    if (insertText.length > 0) t.insert(start, insertText);
                }
            }, localOriginRef.current);
        } else {
            setNodes((nds) => nds.map((n) => n.id === nodeId ? ({ ...n, data: n.type === 'statement' ? { ...n.data, statement: content } : { ...n.data, content } }) : n));
        }
    };

    const deleteNode = (nodeId: string) => {
        if (isLockedForMe?.(nodeId)) {
            const owner = getLockOwner?.(nodeId);
            toast.warning(`Locked by ${owner?.name || 'another user'}`);
            return;
        }
        const node = nodes.find((n: any) => n.id === nodeId);
        if (!node) { return; }
        if (node.type === 'statement') { return; }

        const nodesToDelete = new Set<string>([nodeId]);
        const edgesToDelete = new Set<string>();

        const getIncidentEdges = (nid: string) => edges.filter((e: any) => e.source === nid || e.target === nid);

        let changed = true;
        while (changed) {
            changed = false;

            // For each node marked, mark all incident edges
            for (const nid of Array.from(nodesToDelete)) {
                for (const e of getIncidentEdges(nid)) {
                    if (!edgesToDelete.has(e.id)) {
                        edgesToDelete.add(e.id);
                        changed = true;

                        // If this edge has objections, mark their parts
                        // Find anchors for this base edge
                        for (const n of nodes) {
                            if (n.type === 'edge_anchor' && n.data?.parentEdgeId === e.id) {
                                if (!nodesToDelete.has(n.id)) { nodesToDelete.add(n.id); changed = true; }
                                // objection nodes tied to this base edge
                                for (const on of nodes) {
                                    if (on.type === 'objection' && on.data?.parentEdgeId === e.id) {
                                        if (!nodesToDelete.has(on.id)) { nodesToDelete.add(on.id); changed = true; }
                                    }
                                }
                                // objection edges pointing from objection to the anchor
                                for (const oe of edges) {
                                    if (oe.type === 'objection' && nodesToDelete.has(n.id) && (oe.target === n.id)) {
                                        if (!edgesToDelete.has(oe.id)) { edgesToDelete.add(oe.id); changed = true; }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // After marking edges, remove orphan nodes (non-statement) that will have no edges remaining
            const remainingEdges = edges.filter((e: any) => !edgesToDelete.has(e.id));
            const degree = new Map<string, number>();
            for (const e of remainingEdges) {
                degree.set(e.source, (degree.get(e.source) || 0) + 1);
                degree.set(e.target, (degree.get(e.target) || 0) + 1);
            }
            for (const n of nodes) {
                if (nodesToDelete.has(n.id)) continue;
                if (n.type === 'statement') continue;
                const deg = degree.get(n.id) || 0;
                if (deg === 0) {
                    nodesToDelete.add(n.id);
                    changed = true;
                }
            }
        }

        // Compute final arrays
        const finalNodes = nodes.filter((n: any) => !nodesToDelete.has(n.id));
        const finalEdges = edges.filter((e: any) => !edgesToDelete.has(e.id));

        if (yNodesMap && yEdgesMap && ydoc && isLeader) {
            ydoc.transact(() => {
                // delete edges first
                for (const eid of edgesToDelete) {
                    // eslint-disable-next-line drizzle/enforce-delete-with-where
                    yEdgesMap.delete(eid as any);
                }
                // delete nodes + text entries
                for (const nid of nodesToDelete) {
                    // eslint-disable-next-line drizzle/enforce-delete-with-where
                    yNodesMap.delete(nid as any);
                    // eslint-disable-next-line drizzle/enforce-delete-with-where
                    try { yTextMap?.delete(nid as any); } catch { }
                }
            }, localOriginRef.current);
        } else {
            setEdges(() => finalEdges);
            setNodes(() => finalNodes);
        }
    };

    const addNegationBelow = (parentNodeId: string) => {
        if (isLockedForMe?.(parentNodeId)) {
            const owner = getLockOwner?.(parentNodeId);
            toast.warning(`Locked by ${owner?.name || 'another user'}`);
            return;
        }
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
        if (yNodesMap && yEdgesMap && ydoc && isLeader) {
            ydoc.transact(() => { yNodesMap.set(newId, newNode); yEdgesMap.set(newEdge.id, newEdge); }, localOriginRef.current);
        } else {
            setNodes((curr) => [...curr, newNode]);
            setEdges((eds) => [...eds, newEdge]);
        }
    };

    const addObjectionForEdge = (edgeId: string, overrideMidX?: number, overrideMidY?: number) => {
        const base = edges.find((e: any) => e.id === edgeId);
        if (!base) return;

        const src = nodes.find((n: any) => n.id === base.source);
        const tgt = nodes.find((n: any) => n.id === base.target);
        if (!src || !tgt) return;
        if (isLockedForMe?.(src.id) || isLockedForMe?.(tgt.id)) {
            const lockedNodeId = isLockedForMe?.(src.id) ? src.id : tgt.id;
            const owner = getLockOwner?.(lockedNodeId);
            toast.warning(`Locked by ${owner?.name || 'another user'}`);
            return;
        }
        const midX = overrideMidX ?? ((src.position.x + tgt.position.x) / 2);
        const midY = overrideMidY ?? ((src.position.y + tgt.position.y) / 2);

        const anchorId = `anchor:${edgeId}`;
        const objectionId = `o-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

        const anchorNode: any = { id: anchorId, type: 'edge_anchor', position: { x: midX, y: midY }, data: { parentEdgeId: edgeId } };
        const objectionNode: any = { id: objectionId, type: 'objection', position: { x: midX, y: midY + 60 }, data: { content: 'New objection', parentEdgeId: edgeId } };

        const objectionEdge: any = {
            id: generateEdgeId(),
            type: 'objection',
            source: objectionId,
            target: anchorId
        };
        // Always update local state immediately for responsiveness
        // Batch updates but avoid recursive setState chains
        setNodes((nds) => {
            const existsAnchor = nds.some((n: any) => n.id === anchorId);
            const newNodes = existsAnchor ? [...nds, objectionNode] : [...nds, anchorNode, objectionNode];
            return newNodes;
        });
        setEdges((eds) => {
            const newEdges = [...eds, objectionEdge];
            return newEdges;
        });

        // Also sync to Yjs if available
        if (yNodesMap && yEdgesMap && ydoc && isLeader) {
            ydoc.transact(() => {
                if (!yNodesMap.has(anchorId)) yNodesMap.set(anchorId, anchorNode);
                yNodesMap.set(objectionId, objectionNode);
                if (!yEdgesMap.has(objectionEdge.id)) yEdgesMap.set(objectionEdge.id, objectionEdge);
            }, localOriginRef.current);
        }
    };



    return (
        <div className="fixed inset-0 top-16 bg-gray-50">
            <MultiplayerHeader
                username={username}
                userColor={userColor}
                provider={provider}
                isConnected={isConnected}
                connectionError={connectionError}
                isSaving={isSaving}
                proxyMode={!isLeader}
            />

            <ReactFlowProvider>
                <GraphProvider value={{
                    updateNodeContent,
                    addNegationBelow,
                    deleteNode,
                    beginConnectFromNode: (id: string) => setConnectAnchorId(id),
                    cancelConnect: () => setConnectAnchorId(null),
                    isConnectingFromNodeId: connectAnchorId,
                    addObjectionForEdge,
                    hoveredEdgeId,
                    setHoveredEdge: setHoveredEdgeId,
                    updateEdgeAnchorPosition,
                    startEditingNode: startEditing,
                    stopEditingNode: stopEditing,
                    getEditorsForNode,
                    lockNode,
                    unlockNode,
                    isLockedForMe,
                    getLockOwner,
                    proxyMode: !isLeader,
                }}>
                    <div className="w-full h-full relative">
                        {(!nodes || nodes.length === 0) && (
                            <div className="absolute inset-0 bg-gray-50/80 z-10 flex items-center justify-center">
                                <div className="text-center bg-white/80 px-6 py-4 rounded-lg border shadow-sm">
                                    <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                    <div className="text-sm text-gray-600">Loading graph…</div>
                                </div>
                            </div>
                        )}
                        <GraphCanvas
                            nodes={nodes as any}
                            edges={edges as any}
                            authenticated={authenticated}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            onNodeClick={(e: any, node: any) => {
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
                                if (isLockedForMe?.(parentId) || isLockedForMe?.(childId)) {
                                    const lockedNodeId = isLockedForMe?.(parentId) ? parentId : childId;
                                    const owner = getLockOwner?.(lockedNodeId);
                                    toast.warning(`Locked by ${owner?.name || 'another user'}`);
                                    setConnectAnchorId(null);
                                    return;
                                }
                                const parentType = nodes.find((n: any) => n.id === parentId)?.type;
                                const edgeType = parentType === 'statement' ? 'statement' : 'negation';
                                const exists = edges.some((edge: any) => edge.source === childId && edge.target === parentId && edge.type === edgeType);
                                if (!exists) {
                                    const id = deterministicEdgeId(edgeType, childId, parentId, `${childId}-source-handle`, `${parentId}-incoming-handle`);
                                    const newEdge: any = { id, type: edgeType, source: childId, target: parentId, sourceHandle: `${childId}-source-handle`, targetHandle: `${parentId}-incoming-handle` };
                                    if (yEdgesMap && ydoc && isLeader) {
                                        ydoc.transact(() => { if (!yEdgesMap.has(id)) yEdgesMap.set(id, newEdge); }, localOriginRef.current);
                                    } else {
                                        setEdges((eds) => (eds.some(e => e.id === id) ? eds : [...eds, newEdge]));
                                    }
                                }
                                setConnectAnchorId(null);
                            }}
                            onNodeDragStart={handleNodeDragStart}
                            onNodeDragStop={handleNodeDragStop}
                            onEdgeMouseEnter={(_: any, edge: any) => setHoveredEdgeId(edge.id)}
                            onEdgeMouseLeave={() => setHoveredEdgeId(null)}
                            provider={provider}
                            cursors={cursors as any}
                            username={username}
                            userColor={userColor}
                        />
                        <ToolsBar
                            connectMode={connectMode}
                            setConnectMode={setConnectMode as any}
                            setConnectAnchorId={setConnectAnchorId}
                            canUndo={!!canUndo}
                            canRedo={!!canRedo}
                            undo={undo}
                            redo={redo}
                            connectAnchorId={connectAnchorId}
                        />
                    </div>
                    <GraphUpdater nodes={nodes} edges={edges} setNodes={setNodes} />
                </GraphProvider>
            </ReactFlowProvider>
        </div>
    );
}