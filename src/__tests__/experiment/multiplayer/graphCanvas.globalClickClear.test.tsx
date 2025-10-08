import React from 'react';
import { render } from '@testing-library/react';
import { GraphProvider } from '@/components/experiment/multiplayer/GraphContext';
import { GraphCanvas } from '@/components/experiment/multiplayer/GraphCanvas';

jest.mock('@xyflow/react', () => {
  return {
    __esModule: true,
    SelectionMode: { Partial: 'partial', Full: 'full' },
    Background: () => null,
    Controls: () => null,
    MiniMap: () => null,
    ReactFlow: (props: any) => {
      (globalThis as any).__rfProps = props;
      return React.createElement('div', { 'data-testid': 'rf' });
    },
    useReactFlow: () => ({
      getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
      setViewport: () => void 0,
      screenToFlowPosition: ({ x, y }: any) => ({ x, y }),
      getEdges: () => [],
      getNode: () => null,
    }),
    useViewport: () => ({ x: 0, y: 0, zoom: 1 }),
  };
});

describe('GraphCanvas global click clearing', () => {
  it('clears selection on window click inside canvas bounds', () => {
    const clearNodeSelection = jest.fn();
    const setSelectedEdge = jest.fn();

    const { getByTestId } = render(
      <GraphProvider value={{
        clearNodeSelection,
        setSelectedEdge,
        connectMode: false,
      } as any}>
        <GraphCanvas
          nodes={[] as any}
          edges={[] as any}
          authenticated={true}
          onNodesChange={() => {}}
          onEdgesChange={() => {}}
          onConnect={() => {}}
          onNodeClick={() => {}}
          provider={null as any}
          cursors={new Map()}
          username={'u'}
          userColor={'#000'}
          grabMode={false}
          panOnDrag={[1]}
          panOnScroll={true}
          zoomOnScroll={false}
        />
      </GraphProvider>
    );

    const root = getByTestId('graph-canvas-root');
    const orig = root.getBoundingClientRect;
    (root as any).getBoundingClientRect = () => ({ left: 0, top: 0, right: 1000, bottom: 1000, width: 1000, height: 1000, x: 0, y: 0, toJSON: () => ({}) } as any);

    const dummyTarget = document.createElement('div');
    document.body.appendChild(dummyTarget);
    dummyTarget.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 50, clientY: 50 }));

    expect(clearNodeSelection).toHaveBeenCalled();
    expect(setSelectedEdge).toHaveBeenCalledWith(null);

    (root as any).getBoundingClientRect = orig;
  });

  it('does not clear when clicking on a node target', () => {
    const clearNodeSelection = jest.fn();
    const setSelectedEdge = jest.fn();

    const { getByTestId } = render(
      <GraphProvider value={{
        clearNodeSelection,
        setSelectedEdge,
        connectMode: false,
      } as any}>
        <GraphCanvas
          nodes={[] as any}
          edges={[] as any}
          authenticated={true}
          onNodesChange={() => {}}
          onEdgesChange={() => {}}
          onConnect={() => {}}
          onNodeClick={() => {}}
          provider={null as any}
          cursors={new Map()}
          username={'u'}
          userColor={'#000'}
          grabMode={false}
          panOnDrag={[1]}
          panOnScroll={true}
          zoomOnScroll={false}
        />
      </GraphProvider>
    );

    const root = getByTestId('graph-canvas-root');
    const orig = root.getBoundingClientRect;
    (root as any).getBoundingClientRect = () => ({ left: 0, top: 0, right: 1000, bottom: 1000, width: 1000, height: 1000, x: 0, y: 0, toJSON: () => ({}) } as any);

    const nodeEl = document.createElement('div');
    nodeEl.className = 'react-flow__node';
    document.body.appendChild(nodeEl);
    nodeEl.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 100, clientY: 100 }));

    expect(clearNodeSelection).not.toHaveBeenCalled();
    expect(setSelectedEdge).not.toHaveBeenCalled();

    (root as any).getBoundingClientRect = orig;
  });
});

