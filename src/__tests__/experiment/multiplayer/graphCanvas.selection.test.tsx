import React from 'react';
import { render } from '@testing-library/react';
import { GraphProvider } from '@/components/experiment/multiplayer/GraphContext';
import { GraphCanvas } from '@/components/experiment/multiplayer/GraphCanvas';

// Mock React Flow with a minimal component that forwards props
jest.mock('@xyflow/react', () => {
  return {
    __esModule: true,
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

describe('GraphCanvas selection clearing', () => {
  it('onPaneClick clears node and edge selection via GraphContext', () => {
    const clearNodeSelection = jest.fn();
    const setSelectedEdge = jest.fn();

    render(
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

    const props = (globalThis as any).__rfProps;
    expect(typeof props.onPaneClick).toBe('function');
    props.onPaneClick();

    expect(clearNodeSelection).toHaveBeenCalled();
    expect(setSelectedEdge).toHaveBeenCalledWith(null);
  });
});

