import * as Y from 'yjs';
import { createUpdateEdgeAnchorPosition } from '@/utils/experiment/multiplayer/graphOperations';

describe('createUpdateEdgeAnchorPosition', () => {
  it('updates local anchor node position and syncs to yNodesMap', () => {
    const edgeId = 'edge-abc';
    const anchorId = `anchor:${edgeId}`;

    let nodes: any[] = [
      { id: anchorId, type: 'edge_anchor', position: { x: 10, y: 20 }, data: { parentEdgeId: edgeId } },
    ];
    const setNodes = (updater: any) => {
      nodes = updater(nodes);
    };

    const ydoc = new Y.Doc();
    const yNodesMap = ydoc.getMap<any>('nodes');
    yNodesMap.set(anchorId, { id: anchorId, type: 'edge_anchor', position: { x: 10, y: 20 }, data: { parentEdgeId: edgeId } });

    const update = createUpdateEdgeAnchorPosition(setNodes, yNodesMap, ydoc, true, {});

    update(edgeId, 30, 40);

    const local = nodes.find((n) => n.id === anchorId);
    expect(local.position).toEqual({ x: 30, y: 40 });

    const remote = yNodesMap.get(anchorId);
    expect(remote.position).toEqual({ x: 30, y: 40 });
  });
});

