'use client';

import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  OnConnect,
  NodeTypes,
  BezierEdge,
  EdgeProps,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow,
  useViewport,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Awareness } from 'y-protocols/awareness';

const PointNode = ({ data, id }: { data: any; id: string }) => {
  return (
    <>
      <Handle
        id={`${id}-source-handle`}
        type="source"
        position={Position.Top}
        className="opacity-0 pointer-events-none"
      />
      <Handle
        id={`${id}-incoming-handle`}
        type="target"
        position={Position.Bottom}
        className="opacity-0 pointer-events-none"
      />
      <div className="px-4 py-3 shadow-lg rounded-lg bg-white border-2 border-stone-200 min-w-[200px] max-w-[300px] relative">
        <div className="text-sm text-gray-900 leading-relaxed">
          {data.content}
        </div>
        {data.editedBy && (
          <div className="absolute -top-6 left-0 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
            {data.editedBy}
          </div>
        )}
      </div>
    </>
  );
};

const NegationEdge = (props: EdgeProps) => {
  return (
    <BezierEdge
      {...props}
      style={{
        strokeWidth: 2,
        stroke: "#ef4444",
      }}
      label="-"
      labelShowBg={false}
      labelStyle={{
        padding: 0,
        width: 20,
        height: 20,
        stroke: "white",
        strokeWidth: 2,
        fontSize: 36,
        fontWeight: 600,
        fill: "#ef4444",
      }}
    />
  );
};

const CursorOverlay = ({ cursors }: { cursors: Map<number, any> }) => {
  const { x: vx, y: vy, zoom } = useViewport();
  const dx = 2; // slight right offset to match hotspot
  const dy = 0; // vertical offset if needed
  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {Array.from(cursors.entries()).map(([clientId, cursor]) => {
        const left = (cursor.fx ?? 0) * zoom + vx + dx;
        const top = (cursor.fy ?? 0) * zoom + vy + dy;
        return (
          <div
            key={clientId}
            className="absolute"
            style={{ left, top }}
          >
            <svg width="16" height="24" viewBox="0 0 16 24" className="drop-shadow" style={{ filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.4))' }}>
              <path d="M1 1 L1 18 L5 14 L8 22 L12 21 L9 13 L15 13 Z" fill={cursor.color || '#3b82f6'} stroke="white" strokeWidth="1" />
            </svg>
            <div 
              className="ml-1 px-1.5 py-0.5 text-[10px] rounded text-white inline-block align-middle"
              style={{ backgroundColor: cursor.color || '#3b82f6' }}
            >
              {cursor.name}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const nodeTypes: NodeTypes = {
  point: PointNode,
};

const edgeTypes = {
  negation: NegationEdge,
};

function mapValuesSorted<T>(ymap: Y.Map<T>): T[] {
  const arr: T[] = [];
  // @ts-ignore
  for (const [, v] of ymap) arr.push(v);
  // Try to keep deterministic order by id if present
  // @ts-ignore
  return arr.sort((a, b) => (a.id || '').localeCompare(b.id || ''));
}

function syncYMapFromArray<T extends { id: string }>(ymap: Y.Map<T>, arr: T[]) {
  const nextIds = new Set(arr.map((i) => i.id));
  // Delete removed
  for (const key of Array.from(ymap.keys())) {
    if (!nextIds.has(key)) ymap.delete(key);
  }
  // Upsert all
  for (const item of arr) {
    ymap.set(item.id, item);
  }
}

// Initial hardcoded data
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'point',
    position: { x: 250, y: 50 },
    data: {
      content: 'Universal Basic Income would reduce poverty and provide economic security for all citizens.',
    },
  },
  {
    id: '2',
    type: 'point',
    position: { x: 100, y: 200 },
    data: {
      content: 'UBI would be too expensive and would require massive tax increases that could harm economic growth.',
    },
  },
  {
    id: '3',
    type: 'point',
    position: { x: 400, y: 200 },
    data: {
      content: 'UBI could reduce work incentives and lead to decreased productivity across society.',
    },
  },
  {
    id: '4',
    type: 'point',
    position: { x: 50, y: 350 },
    data: {
      content: 'Alaska has successfully implemented a dividend system for decades without major economic disruption.',
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e1-2',
    source: '2',
    target: '1',
    type: 'negation',
  },
  {
    id: 'e1-3',
    source: '3',
    target: '1',
    type: 'negation',
  },
  {
    id: 'e2-4',
    source: '4',
    target: '2',
    type: 'negation',
  },
];

export default function MultiplayerRationalePage() {
  const [nodes, setNodes, rawOnNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, rawOnEdgesChange] = useEdgesState(initialEdges);
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const yNodesMapRef = useRef<Y.Map<Node> | null>(null);
  const yEdgesMapRef = useRef<Y.Map<Edge> | null>(null);
  const [cursors, setCursors] = useState<Map<number, any>>(new Map());
  // Avoid SSR/client randomness mismatch by initializing deterministically,
  // then randomizing on client after mount.
  const [username, setUsername] = useState<string>("");
  const [userColor, setUserColor] = useState<string>("#3b82f6");

  // Set random identity only on client after mount
  useEffect(() => {
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    setUsername(`User${Math.floor(Math.random() * 1000)}`);
    setUserColor(colors[Math.floor(Math.random() * colors.length)]);
  }, []);

  // Initialize Yjs doc/provider once on mount (awareness + graph maps)
  useEffect(() => {
    const doc = new Y.Doc();
    const wsProvider = new WebsocketProvider('wss://demos.yjs.dev', 'rationale-multiplayer', doc);
    ydocRef.current = doc;
    providerRef.current = wsProvider;

    const awareness = wsProvider.awareness;

    // Listen for awareness changes (other users' cursors)
    const updateCursors = () => {
      const states = awareness.getStates();
      const newCursors = new Map();
      states.forEach((state: any, clientId: number) => {
        if (clientId !== awareness.clientID && state.user?.cursor) {
          newCursors.set(clientId, {
            ...state.user.cursor,
            name: state.user.name,
            color: state.user.color,
          });
        }
      });
      setCursors(newCursors);
    };
    awareness.on('change', updateCursors);

    // Graph Y.Maps
    const yNodes = doc.getMap<Node>('nodes');
    const yEdges = doc.getMap<Edge>('edges');
    yNodesMapRef.current = yNodes;
    yEdgesMapRef.current = yEdges;

    // Seed initial data if empty
    if (yNodes.size === 0 && yEdges.size === 0) {
      doc.transact(() => {
        for (const n of initialNodes) yNodes.set(n.id, n);
        for (const e of initialEdges) yEdges.set(e.id, e);
      }, 'seed');
    }

    const updateNodesFromY = () => {
      setNodes(mapValuesSorted(yNodes));
    };
    const updateEdgesFromY = () => {
      setEdges(mapValuesSorted(yEdges));
    };

    yNodes.observe(updateNodesFromY);
    yEdges.observe(updateEdgesFromY);

    // Initial sync to local state
    updateNodesFromY();
    updateEdgesFromY();

    return () => {
      awareness.off('change', updateCursors);
      yNodes.unobserve(updateNodesFromY);
      yEdges.unobserve(updateEdgesFromY);
      wsProvider.destroy();
      ydocRef.current = null;
      providerRef.current = null;
    };
  }, [setNodes, setEdges]);

  // Update awareness identity when username/color ready
  useEffect(() => {
    const prov = providerRef.current;
    if (!prov) return;
    // Only set when username is ready
    if (!username) return;
    prov.awareness.setLocalStateField('user', {
      name: username,
      color: userColor,
      cursor: { fx: 0, fy: 0 },
    });
  }, [username, userColor]);

  // Removed nodes/edges syncing to Yjs to avoid feedback loops and duplicate keys

  // Track mouse movement for cursor sharing
  // Report local cursor in flow space from within provider context
  const CursorReporter = () => {
    const rf = useReactFlow();
    useEffect(() => {
      const provider = providerRef.current;
      if (!provider) return;
      const update = (clientX: number, clientY: number) => {
        const { x: fx, y: fy } = rf.screenToFlowPosition({ x: clientX, y: clientY });
        provider.awareness.setLocalStateField('user', {
          name: username,
          color: userColor,
          cursor: { fx, fy },
        });
      };
      const onPointerMove = (e: PointerEvent) => update(e.clientX, e.clientY);
      const onMouseMove = (e: MouseEvent) => update(e.clientX, e.clientY);
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('mousemove', onMouseMove, { passive: true });
      return () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('mousemove', onMouseMove);
      };
    }, [rf, username, userColor]);
    return null;
  };

  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      const edge: Edge = {
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `e-${Date.now()}-${Math.floor(Math.random()*1e6)}`,
        source: params.source!,
        target: params.target!,
        sourceHandle: params.sourceHandle || null,
        targetHandle: params.targetHandle || null,
        type: 'negation',
      };
      // Optimistic local update
      setEdges((eds) => addEdge(edge, eds));
      // Sync to Yjs map
      const m = yEdgesMapRef.current;
      const d = ydocRef.current;
      if (m && d) d.transact(() => m.set(edge.id, edge), 'edge-add');
    },
    [setEdges]
  );

  // Wire ReactFlow change handlers to Yjs maps
  const onNodesChange = useCallback((changes: any[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
    const m = yNodesMapRef.current;
    const d = ydocRef.current;
    if (!m || !d) return;
    // Derive next from current state after apply; schedule microtask to read latest
    queueMicrotask(() => {
      const current = typeof document !== 'undefined' ? null : null; // no-op placeholder
      // Use state updater to read latest nodes
      setNodes((curr) => {
        if (d && m) d.transact(() => syncYMapFromArray(m, curr as Node[]), 'nodes-sync');
        return curr;
      });
    });
  }, [setNodes]);

  const onEdgesChange = useCallback((changes: any[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
    const m = yEdgesMapRef.current;
    const d = ydocRef.current;
    if (!m || !d) return;
    queueMicrotask(() => {
      setEdges((curr) => {
        if (d && m) d.transact(() => syncYMapFromArray(m, curr as Edge[]), 'edges-sync');
        return curr;
      });
    });
  }, [setEdges]);

  const handleNodeDrag = useCallback((event: React.MouseEvent, node: Node) => {
    // Add visual indicator that this node is being edited
    const updatedNode = {
      ...node,
      data: {
        ...node.data,
        editedBy: username,
      }
    };
    
    setNodes((nds) => 
      nds.map((n) => n.id === node.id ? updatedNode : n)
    );
    
    // Clear the indicator after 2 seconds
    setTimeout(() => {
      setNodes((nds) => 
        nds.map((n) => n.id === node.id ? {
          ...n,
          data: {
            ...n.data,
            editedBy: undefined,
          }
        } : n)
      );
    }, 2000);
  }, [setNodes, username]);

  return (
    <div className="fixed inset-0 top-16 bg-gray-50">
      <div className="absolute top-4 left-4 z-10 bg-white p-4 rounded-lg shadow-lg border">
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Multiplayer Rationale System
        </h1>
        <p className="text-sm text-gray-600">
          You are: <span className="font-semibold" style={{ color: userColor }}>{username}</span>
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Real-time collaborative editing with Yjs
        </p>
      </div>
      
      <ReactFlowProvider>
        <div className="w-full h-full relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDrag={handleNodeDrag}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            className="w-full h-full bg-gray-50"
          >
            <Background />
            <Controls />
            <MiniMap
              nodeColor={() => '#dbeafe'}
              className="bg-white"
            />
          </ReactFlow>
          <CursorOverlay cursors={cursors} />
          <CursorReporter />
        </div>
      </ReactFlowProvider>
    </div>
  );
}
