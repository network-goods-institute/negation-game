import { Node, Edge, addEdge, applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import * as Y from 'yjs';

export const generateEdgeId = (): string => {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto 
    ? crypto.randomUUID() 
    : `e-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
};

export const createNegationEdge = (source: string, target: string, sourceHandle?: string | null, targetHandle?: string | null): Edge => {
  return {
    id: generateEdgeId(),
    source,
    target,
    sourceHandle: sourceHandle || null,
    targetHandle: targetHandle || null,
    type: 'negation',
  };
};

export const createGraphChangeHandlers = (
  setNodes: (updater: (nodes: Node[]) => Node[]) => void,
  setEdges: (updater: (edges: Edge[]) => Edge[]) => void,
  yNodesMap: Y.Map<Node> | null,
  yEdgesMap: Y.Map<Edge> | null,
  ydoc: Y.Doc | null,
  syncYMapFromArray: <T extends { id: string }>(ymap: Y.Map<T>, arr: T[]) => void
) => {
  const onNodesChange = (changes: any[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
    const m = yNodesMap;
    const d = ydoc;
    if (!m || !d) return;
    // Use microtask to read latest nodes state
    queueMicrotask(() => {
      setNodes((curr) => {
        if (d && m) d.transact(() => syncYMapFromArray(m, curr as Node[]), 'nodes-sync');
        return curr;
      });
    });
  };

  const onEdgesChange = (changes: any[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
    const m = yEdgesMap;
    const d = ydoc;
    if (!m || !d) return;
    queueMicrotask(() => {
      setEdges((curr) => {
        if (d && m) d.transact(() => syncYMapFromArray(m, curr as Edge[]), 'edges-sync');
        return curr;
      });
    });
  };

  const onConnect = (params: { source?: string; target?: string; sourceHandle?: string | null; targetHandle?: string | null }) => {
    if (!params.source || !params.target) return;
    
    const edge = createNegationEdge(params.source, params.target, params.sourceHandle, params.targetHandle);
    
    // Optimistic local update
    setEdges((eds) => addEdge(edge, eds));
    
    // Sync to Yjs map
    const m = yEdgesMap;
    const d = ydoc;
    if (m && d) d.transact(() => m.set(edge.id, edge), 'edge-add');
  };

  return {
    onNodesChange,
    onEdgesChange,
    onConnect,
  };
};

export const createNodeDragHandler = (
  setNodes: (updater: (nodes: Node[]) => Node[]) => void,
  username: string
) => {
  return (event: React.MouseEvent, node: Node) => {
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
  };
};