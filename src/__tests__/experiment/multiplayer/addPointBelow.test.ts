import { createAddPointBelow } from '@/utils/experiment/multiplayer/graphOperations';
import * as Y from 'yjs';

jest.mock('sonner', () => ({ toast: { warning: jest.fn(), success: jest.fn(), info: jest.fn(), error: jest.fn() } }));

describe('createAddPointBelow', () => {
  const buildEnv = (parent: { id: string; type: string }) => {
    const doc = new Y.Doc();
    const yNodesMap = doc.getMap<any>('nodes');
    const yEdgesMap = doc.getMap<any>('edges');
    const yTextMap = doc.getMap<Y.Text>('node_text');
    let nodes = [
      {
        id: parent.id,
        type: parent.type,
        position: { x: 0, y: 0 },
        data: parent.type === 'statement' ? { statement: 'Parent question' } : { content: 'Parent point', favor: 5 },
      },
    ];
    let edges: any[] = [];

    doc.transact(() => {
      nodes.forEach((node) => yNodesMap.set(node.id, node as any));
    });

    const setNodes = (updater: (curr: any[]) => any[]) => {
      nodes = updater(nodes);
      return nodes;
    };

    const setEdges = (updater: (curr: any[]) => any[]) => {
      edges = updater(edges);
      return edges;
    };

    return { doc, yNodesMap, yEdgesMap, yTextMap, setNodes, setEdges, getNodes: () => nodes, getEdges: () => edges };
  };

  it('uses preferred support edge for point parents', () => {
    const env = buildEnv({ id: 'parent', type: 'point' });
    const onEdgeCreated = jest.fn();
    const addPointBelow = createAddPointBelow(
      env.getNodes(),
      env.yNodesMap,
      env.yEdgesMap,
      env.yTextMap,
      env.doc,
      true,
      {},
      { current: {} },
      env.setNodes,
      env.setEdges,
      undefined,
      undefined,
      undefined,
      {
        getPreferredEdgeType: () => 'support',
        onEdgeCreated,
      }
    );

    const result = addPointBelow('parent');

    expect(result?.edgeType).toBe('support');
    expect(env.getEdges()[0].type).toBe('support');
    expect(onEdgeCreated).toHaveBeenCalledWith(expect.objectContaining({ edgeType: 'support' }));
  });

  it('uses preferred negation edge for point parents', () => {
    const env = buildEnv({ id: 'parent', type: 'point' });
    const addPointBelow = createAddPointBelow(
      env.getNodes(),
      env.yNodesMap,
      env.yEdgesMap,
      env.yTextMap,
      env.doc,
      true,
      {},
      { current: {} },
      env.setNodes,
      env.setEdges,
      undefined,
      undefined,
      undefined,
      {
        getPreferredEdgeType: () => 'negation',
      }
    );

    const result = addPointBelow('parent');

    expect(result?.edgeType).toBe('negation');
    expect(env.getEdges()[0].type).toBe('negation');
  });

  it('falls back to option edges for statement parents', () => {
    const env = buildEnv({ id: 'parent', type: 'statement' });
    const addPointBelow = createAddPointBelow(
      env.getNodes(),
      env.yNodesMap,
      env.yEdgesMap,
      env.yTextMap,
      env.doc,
      true,
      {},
      { current: {} },
      env.setNodes,
      env.setEdges,
      undefined,
      undefined,
      undefined,
      {
        getPreferredEdgeType: () => 'negation',
      }
    );

    const result = addPointBelow('parent');

    expect(result?.edgeType).toBe('option');
    expect(env.getEdges()[0].type).toBe('option');
  });
});
