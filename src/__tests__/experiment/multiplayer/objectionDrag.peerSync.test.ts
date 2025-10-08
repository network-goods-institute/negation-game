import * as Y from 'yjs';
import { createEnsureEdgeAnchor } from '@/utils/experiment/multiplayer/graphOperations';

describe('objection drag peer sync (anchor intact)', () => {
  const makeDoc = () => {
    const doc = new Y.Doc();
    const nodes = doc.getMap<any>('nodes');
    const edges = doc.getMap<any>('edges');
    return { doc, nodes, edges } as const;
  };

  const sync = (from: Y.Doc, to: Y.Doc) => {
    const update = Y.encodeStateAsUpdate(from);
    Y.applyUpdate(to, update);
  };

  it('keeps objection edge targeted at anchor for peers while the objection node moves', () => {
    const A = makeDoc();
    const B = makeDoc();

    const p1 = { id: 'p1', type: 'point', position: { x: 0, y: 0 }, data: {} };
    const p2 = { id: 'p2', type: 'point', position: { x: 200, y: 0 }, data: {} };
    const baseEdgeId = 'edge-main';
    const baseEdge = { id: baseEdgeId, type: 'negation', source: 'p1', target: 'p2' };
    const anchorId = `anchor:${baseEdgeId}`;
    const objNode = { id: 'obj-1', type: 'objection', position: { x: 100, y: 60 }, data: { parentEdgeId: baseEdgeId } };
    const objEdge = { id: 'obj-edge-1', type: 'objection', source: 'obj-1', target: anchorId };

    // Seed A
    A.nodes.set(p1.id, p1);
    A.nodes.set(p2.id, p2);
    A.nodes.set(objNode.id, objNode);
    A.edges.set(baseEdge.id, baseEdge);
    A.edges.set(objEdge.id, objEdge);

    // Ensure anchor exists before drag
    const ensure = createEnsureEdgeAnchor(A.nodes, A.doc, true, {});
    ensure(anchorId, baseEdgeId, 100, 0);

    // Sync to B
    sync(A.doc, B.doc);

    // Sanity: B sees anchor and objection edge to anchor
    const bAnchor1 = B.nodes.get(anchorId);
    const bObjEdge1 = B.edges.get(objEdge.id);
    expect(bAnchor1?.id).toBe(anchorId);
    expect(bObjEdge1?.target).toBe(anchorId);

    // Drag: move objection node on A
    const movedObj = { ...objNode, position: { x: 100, y: 120 } };
    A.doc.transact(() => {
      A.nodes.set(objNode.id, movedObj);
    }, {});

    // Sync delta to B
    sync(A.doc, B.doc);

    // Anchor still exists on B and objection edge still targets it
    const bAnchor2 = B.nodes.get(anchorId);
    const bObjEdge2 = B.edges.get(objEdge.id);
    expect(bAnchor2?.id).toBe(anchorId);
    expect(bObjEdge2?.target).toBe(anchorId);
    expect(bAnchor2?.data?.parentEdgeId).toBe(baseEdgeId);
  });
});

