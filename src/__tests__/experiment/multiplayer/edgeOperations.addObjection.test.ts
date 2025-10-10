import * as Y from 'yjs';
import { createAddObjectionForEdge } from '@/utils/experiment/multiplayer/graphOperations';

describe('createAddObjectionForEdge', () => {
  it('creates local-only anchor, plus objection node/edge, and Y.Text', () => {
    const doc = new Y.Doc();
    const yNodes = doc.getMap<any>('nodes');
    const yEdges = doc.getMap<any>('edges');
    const yText = doc.getMap<Y.Text>('node_text');

    let nodes: any[] = [];
    let edges: any[] = [];
    const setNodes = (updater: (n: any[]) => any[]) => { nodes = updater(nodes); };
    const setEdges = (updater: (e: any[]) => any[]) => { edges = updater(edges); };

    const src = { id: 'n1', type: 'point', position: { x: 0, y: 0 }, data: {} };
    const tgt = { id: 'n2', type: 'point', position: { x: 200, y: 0 }, data: {} };
    const baseEdgeId = 'e-main';
    const baseEdge = { id: baseEdgeId, type: 'negation', source: src.id, target: tgt.id };

    nodes = [src, tgt];
    edges = [baseEdge];

    const addObj = createAddObjectionForEdge(
      nodes,
      edges,
      yNodes,
      yEdges,
      yText,
      doc,
      true,
      {},
      setNodes,
      setEdges
    );

    addObj(baseEdgeId);

    // Local state updated
    const anchor = nodes.find((n) => n.type === 'edge_anchor' && n.data?.parentEdgeId === baseEdgeId);
    const objection = nodes.find((n) => n.type === 'objection');
    const objEdge = edges.find((e) => e.type === 'objection' && e.source === objection?.id && e.target === anchor?.id);
    expect(anchor).toBeTruthy();
    expect(objection).toBeTruthy();
    expect(objEdge).toBeTruthy();

    const yAnchor = Array.from(yNodes.values()).find((n: any) => n?.type === 'edge_anchor' && n?.data?.parentEdgeId === baseEdgeId);
    expect(yAnchor).toBeFalsy();
    const yTextEntry = yText.get((objection as any).id);
    expect(yTextEntry instanceof Y.Text).toBe(true);
    expect((yTextEntry as Y.Text).toString().length).toBeGreaterThan(0);
  });
});
