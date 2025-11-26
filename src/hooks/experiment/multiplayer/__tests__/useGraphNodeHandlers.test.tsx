import { renderHook, act } from '@testing-library/react';
import { useReactFlow } from '@xyflow/react';
import { toast } from 'sonner';
import { useGraphNodeHandlers } from '../useGraphNodeHandlers';

jest.mock('@xyflow/react', () => ({
  useReactFlow: jest.fn(),
  useViewport: jest.fn(() => ({ zoom: 1 })),
}));
jest.mock('sonner');

describe('useGraphNodeHandlers', () => {
  const mockGraph = {
    getEditorsForNode: jest.fn(),
    ensureEdgeAnchor: jest.fn(),
    duplicateNodeWithConnections: jest.fn(),
    unlockNode: jest.fn(),
    lockNode: jest.fn(),
    updateNodePosition: jest.fn(),
    stopCapturing: jest.fn(),
  };

  const mockRf = {
    getNodes: jest.fn(),
    getNode: jest.fn(),
    getEdges: jest.fn(),
    setNodes: jest.fn(),
    screenToFlowPosition: jest.fn(),
  };

  const mockOnNodeClick = jest.fn();
  const mockOnNodeDragStart = jest.fn();
  const mockOnNodeDragStop = jest.fn();
  const altCloneMapRef = {
    current: new Map<string, { dupId: string; origin: { x: number; y: number } }>(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useReactFlow as jest.Mock).mockReturnValue(mockRf);
    mockRf.getNodes.mockReturnValue([]);
    mockRf.getEdges.mockReturnValue([]);
    altCloneMapRef.current.clear();
    global.requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(0);
      return 1 as any;
    };
    global.cancelAnimationFrame = jest.fn();
  });

  describe('handleNodeClick', () => {
    it('should call onNodeClick in normal mode', () => {
      const { result } = renderHook(() =>
        useGraphNodeHandlers({
          graph: mockGraph,
          grabMode: false,
          selectMode: false,
          onNodeClick: mockOnNodeClick,
          onNodeDragStart: mockOnNodeDragStart,
          onNodeDragStop: mockOnNodeDragStop,
          altCloneMapRef,
        })
      );

      const mockEvent = {};
      const mockNode = { id: 'node-1', type: 'point' };

      act(() => {
        result.current.handleNodeClick(mockEvent, mockNode);
      });

      expect(mockOnNodeClick).toHaveBeenCalledWith(mockEvent, mockNode);
    });

    it('should prevent click in grab mode', () => {
      const { result } = renderHook(() =>
        useGraphNodeHandlers({
          graph: mockGraph,
          grabMode: true,
          selectMode: false,
          onNodeClick: mockOnNodeClick,
          onNodeDragStart: mockOnNodeDragStart,
          onNodeDragStop: mockOnNodeDragStop,
          altCloneMapRef,
        })
      );

      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      };
      const mockNode = { id: 'node-1', type: 'point' };

      act(() => {
        result.current.handleNodeClick(mockEvent, mockNode);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(mockOnNodeClick).not.toHaveBeenCalled();
    });

    it('should toggle node selection on shift-click in select mode', () => {
      const mockNodes = [
        { id: 'node-1', selected: false, type: 'point' },
        { id: 'node-2', selected: true, type: 'point' },
      ];
      mockRf.getNodes.mockReturnValue(mockNodes);

      const { result } = renderHook(() =>
        useGraphNodeHandlers({
          graph: mockGraph,
          grabMode: false,
          selectMode: true,
          onNodeClick: mockOnNodeClick,
          onNodeDragStart: mockOnNodeDragStart,
          onNodeDragStop: mockOnNodeDragStop,
          altCloneMapRef,
        })
      );

      const mockEvent = {
        shiftKey: true,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      };
      const mockNode = { id: 'node-1', selected: false };

      act(() => {
        result.current.handleNodeClick(mockEvent, mockNode);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(mockRf.setNodes).toHaveBeenCalledWith([
        { id: 'node-1', selected: true, type: 'point' },
        { id: 'node-2', selected: true, type: 'point' },
      ]);
      expect(mockOnNodeClick).not.toHaveBeenCalled();
    });
  });

  describe('handleNodeDragStart', () => {
    it('should call onNodeDragStart', () => {
      const { result } = renderHook(() =>
        useGraphNodeHandlers({
          graph: mockGraph,
          grabMode: false,
          selectMode: false,
          onNodeClick: mockOnNodeClick,
          onNodeDragStart: mockOnNodeDragStart,
          onNodeDragStop: mockOnNodeDragStop,
          altCloneMapRef,
        })
      );

      const mockEvent = {};
      const mockNode = { id: 'node-1', type: 'point', position: { x: 0, y: 0 } };

      act(() => {
        result.current.handleNodeDragStart(mockEvent, mockNode);
      });

      expect(mockOnNodeDragStart).toHaveBeenCalledWith(mockEvent, mockNode);
    });

    it('should prevent drag when objection is being edited', () => {
      mockRf.getEdges.mockReturnValue([
        { id: 'edge-1', source: 'node-1', target: 'node-2' },
      ]);
      mockRf.getNodes.mockReturnValue([
        {
          id: 'objection-1',
          type: 'objection',
          data: { parentEdgeId: 'edge-1' },
        },
      ]);
      mockGraph.getEditorsForNode.mockReturnValue([
        { name: 'John Doe', id: 'user-1' },
      ]);

      const { result } = renderHook(() =>
        useGraphNodeHandlers({
          graph: mockGraph,
          grabMode: false,
          selectMode: false,
          onNodeClick: mockOnNodeClick,
          onNodeDragStart: mockOnNodeDragStart,
          onNodeDragStop: mockOnNodeDragStop,
          altCloneMapRef,
        })
      );

      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      };
      const mockNode = { id: 'node-1', type: 'point', position: { x: 0, y: 0 } };

      act(() => {
        result.current.handleNodeDragStart(mockEvent, mockNode);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(toast.warning).toHaveBeenCalledWith('Locked by John Doe');
    });

    it('should ensure edge anchor for objection node drag', () => {
      mockRf.getEdges.mockReturnValue([
        { id: 'objection-edge', type: 'objection', source: 'objection-1', target: 'anchor-1' },
      ]);
      mockRf.getNode.mockReturnValue({
        id: 'anchor-1',
        type: 'edge_anchor',
        data: { parentEdgeId: 'base-edge' },
        position: { x: 100, y: 200 },
      });

      const { result } = renderHook(() =>
        useGraphNodeHandlers({
          graph: mockGraph,
          grabMode: false,
          selectMode: false,
          onNodeClick: mockOnNodeClick,
          onNodeDragStart: mockOnNodeDragStart,
          onNodeDragStop: mockOnNodeDragStop,
          altCloneMapRef,
        })
      );

      const mockNode = {
        id: 'objection-1',
        type: 'objection',
        position: { x: 0, y: 0 },
      };

      act(() => {
        result.current.handleNodeDragStart({}, mockNode);
      });

      expect(mockGraph.ensureEdgeAnchor).toHaveBeenCalledWith(
        'anchor-1',
        'base-edge',
        100,
        200
      );
    });

    it('should duplicate node on Alt-drag', () => {
      mockRf.screenToFlowPosition.mockReturnValue({ x: 150, y: 250 });
      mockGraph.duplicateNodeWithConnections.mockReturnValue('node-2');

      const { result } = renderHook(() =>
        useGraphNodeHandlers({
          graph: mockGraph,
          grabMode: false,
          selectMode: false,
          onNodeClick: mockOnNodeClick,
          onNodeDragStart: mockOnNodeDragStart,
          onNodeDragStop: mockOnNodeDragStop,
          altCloneMapRef,
        })
      );

      const mockEvent = {
        altKey: true,
        clientX: 200,
        clientY: 300,
      };
      const mockNode = {
        id: 'node-1',
        type: 'point',
        position: { x: 100, y: 200 },
      };

      act(() => {
        result.current.handleNodeDragStart(mockEvent, mockNode);
      });

      expect(mockGraph.duplicateNodeWithConnections).toHaveBeenCalledWith(
        'node-1',
        { x: 50, y: 50 }
      );
      expect(mockGraph.unlockNode).toHaveBeenCalledWith('node-1');
      expect(mockGraph.lockNode).toHaveBeenCalledWith('node-2', 'drag');
      expect(altCloneMapRef.current.get('node-1')).toEqual({
        dupId: 'node-2',
        origin: { x: 100, y: 200 },
      });
    });

    it('should not duplicate edge_anchor nodes', () => {
      const { result } = renderHook(() =>
        useGraphNodeHandlers({
          graph: mockGraph,
          grabMode: false,
          selectMode: false,
          onNodeClick: mockOnNodeClick,
          onNodeDragStart: mockOnNodeDragStart,
          onNodeDragStop: mockOnNodeDragStop,
          altCloneMapRef,
        })
      );

      const mockEvent = {
        altKey: true,
        clientX: 200,
        clientY: 300,
      };
      const mockNode = {
        id: 'anchor-1',
        type: 'edge_anchor',
        position: { x: 100, y: 200 },
      };

      act(() => {
        result.current.handleNodeDragStart(mockEvent, mockNode);
      });

      expect(mockGraph.duplicateNodeWithConnections).not.toHaveBeenCalled();
    });

    it('should duplicate group nodes on Alt-drag', () => {
      mockRf.screenToFlowPosition.mockReturnValue({ x: 150, y: 250 });
      mockGraph.duplicateNodeWithConnections.mockReturnValue('group-2');

      const { result } = renderHook(() =>
        useGraphNodeHandlers({
          graph: mockGraph,
          grabMode: false,
          selectMode: false,
          onNodeClick: mockOnNodeClick,
          onNodeDragStart: mockOnNodeDragStart,
          onNodeDragStop: mockOnNodeDragStop,
          altCloneMapRef,
        })
      );

      const mockEvent = {
        altKey: true,
        clientX: 200,
        clientY: 300,
      };
      const mockNode = {
        id: 'group-1',
        type: 'group',
        position: { x: 100, y: 200 },
      };

      act(() => {
        result.current.handleNodeDragStart(mockEvent, mockNode);
      });

      expect(mockGraph.duplicateNodeWithConnections).toHaveBeenCalledWith(
        'group-1',
        { x: 50, y: 50 }
      );
      expect(mockGraph.unlockNode).toHaveBeenCalledWith('group-1');
      expect(mockGraph.lockNode).toHaveBeenCalledWith('group-2', 'drag');
    });
  });

  describe('handleNodeDrag', () => {
    it('should update node position during drag', () => {
      const { result } = renderHook(() =>
        useGraphNodeHandlers({
          graph: mockGraph,
          grabMode: false,
          selectMode: false,
          onNodeClick: mockOnNodeClick,
          onNodeDragStart: mockOnNodeDragStart,
          onNodeDragStop: mockOnNodeDragStop,
          altCloneMapRef,
        })
      );

      const startNode = {
        id: 'node-1',
        type: 'point',
        position: { x: 0, y: 0 },
      };

      act(() => {
        result.current.handleNodeDragStart({}, startNode);
      });

      const mockNode = {
        id: 'node-1',
        type: 'point',
        position: { x: 150, y: 250 },
      };

      act(() => {
        result.current.handleNodeDrag(null, mockNode);
      });

      expect(mockGraph.updateNodePosition).toHaveBeenCalledWith('node-1', 150, 250);
    });

    it('should update duplicate node position during Alt-drag', () => {
      altCloneMapRef.current.set('node-1', {
        dupId: 'node-2',
        origin: { x: 100, y: 200 },
      });

      const { result } = renderHook(() =>
        useGraphNodeHandlers({
          graph: mockGraph,
          grabMode: false,
          selectMode: false,
          onNodeClick: mockOnNodeClick,
          onNodeDragStart: mockOnNodeDragStart,
          onNodeDragStop: mockOnNodeDragStop,
          altCloneMapRef,
        })
      );

      const mockNode = {
        id: 'node-1',
        type: 'point',
        position: { x: 150, y: 250 },
      };

      act(() => {
        result.current.handleNodeDrag(null, mockNode);
      });

      expect(mockGraph.updateNodePosition).toHaveBeenCalledWith('node-2', 150, 250);
      expect(mockGraph.updateNodePosition).toHaveBeenCalledWith('node-1', 100, 200);
    });

    it('should batch update all selected nodes when dragging primary in multi-select', () => {
      const nodeA = { id: 'a', type: 'point', selected: true, position: { x: 10, y: 20 } };
      const nodeB = { id: 'b', type: 'point', selected: true, position: { x: 60, y: 80 } };
      mockRf.getNodes.mockReturnValue([nodeA, nodeB]);

      const { result } = renderHook(() =>
        useGraphNodeHandlers({
          graph: mockGraph,
          grabMode: false,
          selectMode: false,
          onNodeClick: mockOnNodeClick,
          onNodeDragStart: mockOnNodeDragStart,
          onNodeDragStop: mockOnNodeDragStop,
          altCloneMapRef,
        })
      );

      act(() => {
        result.current.handleNodeDragStart({}, nodeA);
      });

      const dragged = { id: 'a', type: 'point', position: { x: 20, y: 30 } };

      act(() => {
        result.current.handleNodeDrag({}, dragged);
      });

      expect(mockGraph.updateNodePosition).toHaveBeenCalledWith('a', 20, 30);
      expect(mockGraph.updateNodePosition).toHaveBeenCalledWith('b', 70, 90);
    });

    it('should not update follower directly during multi-select drag', () => {
      const nodeA = { id: 'a', type: 'point', selected: true, position: { x: 0, y: 0 } };
      const nodeB = { id: 'b', type: 'point', selected: true, position: { x: 10, y: 10 } };
      mockRf.getNodes.mockReturnValue([nodeA, nodeB]);

      const { result } = renderHook(() =>
        useGraphNodeHandlers({
          graph: mockGraph,
          grabMode: false,
          selectMode: false,
          onNodeClick: mockOnNodeClick,
          onNodeDragStart: mockOnNodeDragStart,
          onNodeDragStop: mockOnNodeDragStop,
          altCloneMapRef,
        })
      );

      act(() => {
        result.current.handleNodeDragStart({}, nodeA);
      });

      act(() => {
        result.current.handleNodeDrag({}, { id: 'b', type: 'point', position: { x: 12, y: 12 } });
      });

      expect(mockGraph.updateNodePosition).not.toHaveBeenCalled();
    });

    it('should bypass snapping with ctrl during multi-select and update only leader', () => {
      const nodeA = { id: 'a', type: 'point', selected: true, position: { x: 0, y: 0 } };
      const nodeB = { id: 'b', type: 'point', selected: true, position: { x: 10, y: 10 } };
      mockRf.getNodes.mockReturnValue([nodeA, nodeB]);

      const { result } = renderHook(() =>
        useGraphNodeHandlers({
          graph: mockGraph,
          grabMode: false,
          selectMode: false,
          onNodeClick: mockOnNodeClick,
          onNodeDragStart: mockOnNodeDragStart,
          onNodeDragStop: mockOnNodeDragStop,
          altCloneMapRef,
        })
      );

      act(() => {
        result.current.handleNodeDragStart({}, nodeA);
      });

      act(() => {
        result.current.handleNodeDrag({ ctrlKey: true }, { id: 'a', type: 'point', position: { x: 5, y: 6 } });
      });

      expect(mockGraph.updateNodePosition).toHaveBeenCalledTimes(1);
      expect(mockGraph.updateNodePosition).toHaveBeenCalledWith('a', 5, 6);
    });
  });

  describe('handleNodeDragStop', () => {
    it('should call onNodeDragStop and stopCapturing', () => {
      const { result } = renderHook(() =>
        useGraphNodeHandlers({
          graph: mockGraph,
          grabMode: false,
          selectMode: false,
          onNodeClick: mockOnNodeClick,
          onNodeDragStart: mockOnNodeDragStart,
          onNodeDragStop: mockOnNodeDragStop,
          altCloneMapRef,
        })
      );

      const mockEvent = {};
      const mockNode = { id: 'node-1', type: 'point', position: { x: 0, y: 0 } };

      act(() => {
        result.current.handleNodeDragStop(mockEvent, mockNode);
      });

      expect(mockOnNodeDragStop).toHaveBeenCalledWith(mockEvent, mockNode);
      expect(mockGraph.stopCapturing).toHaveBeenCalled();
    });

    it('should unlock duplicate node and clean up after Alt-drag', () => {
      altCloneMapRef.current.set('node-1', {
        dupId: 'node-2',
        origin: { x: 100, y: 200 },
      });

      const { result } = renderHook(() =>
        useGraphNodeHandlers({
          graph: mockGraph,
          grabMode: false,
          selectMode: false,
          onNodeClick: mockOnNodeClick,
          onNodeDragStart: mockOnNodeDragStart,
          onNodeDragStop: mockOnNodeDragStop,
          altCloneMapRef,
        })
      );

      const mockEvent = {};
      const mockNode = { id: 'node-1', type: 'point', position: { x: 150, y: 250 } };

      act(() => {
        result.current.handleNodeDragStop(mockEvent, mockNode);
      });

      expect(mockGraph.unlockNode).toHaveBeenCalledWith('node-2');
      expect(altCloneMapRef.current.has('node-1')).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle missing graph methods gracefully', () => {
      const minimalGraph = {};

      const { result } = renderHook(() =>
        useGraphNodeHandlers({
          graph: minimalGraph,
          grabMode: false,
          selectMode: false,
          onNodeClick: mockOnNodeClick,
          onNodeDragStart: mockOnNodeDragStart,
          onNodeDragStop: mockOnNodeDragStop,
          altCloneMapRef,
        })
      );

      const mockNode = { id: 'node-1', type: 'point', position: { x: 0, y: 0 } };

      // Should not throw
      expect(() => {
        act(() => {
          result.current.handleNodeClick({}, mockNode);
          result.current.handleNodeDragStart({}, mockNode);
          result.current.handleNodeDrag(null, mockNode);
          result.current.handleNodeDragStop({}, mockNode);
        });
      }).not.toThrow();
    });

    it('should handle nodes without positions', () => {
      const { result } = renderHook(() =>
        useGraphNodeHandlers({
          graph: mockGraph,
          grabMode: false,
          selectMode: false,
          onNodeClick: mockOnNodeClick,
          onNodeDragStart: mockOnNodeDragStart,
          onNodeDragStop: mockOnNodeDragStop,
          altCloneMapRef,
        })
      );

      const startNode = { id: 'node-1', type: 'point', position: { x: 0, y: 0 } };

      act(() => {
        result.current.handleNodeDragStart({}, startNode);
      });

      const mockNode = { id: 'node-1', type: 'point', position: undefined };

      act(() => {
        result.current.handleNodeDrag(null, mockNode);
      });

      expect(mockGraph.updateNodePosition).toHaveBeenCalledWith('node-1', 0, 0);
    });
  });
});
