import { renderHook, act } from '@testing-library/react';
import { useReactFlow } from '@xyflow/react';
import { useGraphContextMenu } from '../useGraphContextMenu';

jest.mock('@xyflow/react');

describe('useGraphContextMenu', () => {
  const mockGraph: any = {
    deleteNode: jest.fn(),
    addPointBelow: jest.fn(),
    updateNodeType: jest.fn(),
    startEditingNode: jest.fn(),
  };

  const mockRf: any = {
    getNodes: jest.fn(),
    getNode: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGraph.deleteNode = jest.fn();
    mockGraph.addPointBelow = jest.fn();
    mockGraph.updateNodeType = jest.fn();
    mockGraph.startEditingNode = jest.fn();
    (useReactFlow as jest.Mock).mockReturnValue(mockRf);
    mockRf.getNodes.mockReturnValue([]);
  });

  it('should initialize with menu closed', () => {
    const { result } = renderHook(() => useGraphContextMenu({ graph: mockGraph }));

    expect(result.current.multiSelectMenuOpen).toBe(false);
    expect(result.current.multiSelectMenuPos).toEqual({ x: 0, y: 0 });
  });

  describe('handleMultiSelectContextMenu', () => {
    it('should open menu when right-clicking a node', () => {
      mockRf.getNodes.mockReturnValue([
        { id: 'node-1', selected: true, type: 'point' },
        { id: 'node-2', selected: true, type: 'point' },
      ]);
      mockRf.getNode.mockReturnValue({ id: 'node-1', selected: true, type: 'point' });

      const { result } = renderHook(() => useGraphContextMenu({ graph: mockGraph }));

      const mockEvent = {
        clientX: 500,
        clientY: 300,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: {
          closest: jest.fn().mockReturnValue({
            getAttribute: jest.fn().mockReturnValue('node-1')
          })
        }
      };

      act(() => {
        result.current.handleMultiSelectContextMenu(
          mockEvent as any as React.MouseEvent
        );
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(result.current.multiSelectMenuOpen).toBe(true);
      expect(result.current.multiSelectMenuPos).toEqual({ x: 500, y: 300 });
    });

    it('should open menu when right-clicking a single selected node', () => {
      mockRf.getNodes.mockReturnValue([
        { id: 'node-1', selected: true, type: 'point' },
        { id: 'node-2', selected: false, type: 'point' },
      ]);
      mockRf.getNode.mockReturnValue({ id: 'node-1', selected: true, type: 'point' });

      const { result } = renderHook(() => useGraphContextMenu({ graph: mockGraph }));

      const mockEvent = {
        clientX: 500,
        clientY: 300,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: {
          closest: jest.fn().mockReturnValue({
            getAttribute: jest.fn().mockReturnValue('node-1')
          })
        }
      };

      act(() => {
        result.current.handleMultiSelectContextMenu(
          mockEvent as any as React.MouseEvent
        );
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(result.current.multiSelectMenuOpen).toBe(true);
    });

    it('should not open menu when not clicking on a node element', () => {
      mockRf.getNodes.mockReturnValue([
        { id: 'node-1', selected: false, type: 'point' },
        { id: 'node-2', selected: false, type: 'point' },
      ]);

      const { result } = renderHook(() => useGraphContextMenu({ graph: mockGraph }));

      const mockEvent = {
        clientX: 500,
        clientY: 300,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: {
          closest: jest.fn().mockReturnValue(null)
        }
      };

      act(() => {
        result.current.handleMultiSelectContextMenu(
          mockEvent as any as React.MouseEvent
        );
      });

      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(result.current.multiSelectMenuOpen).toBe(false);
    });
  });

  describe('handleDeleteSelectedNodes', () => {
    it('should delete multiple selected nodes', () => {
      mockRf.getNodes.mockReturnValue([
        { id: 'node-1', selected: true, type: 'point' },
        { id: 'node-2', selected: true, type: 'point' },
        { id: 'node-3', selected: false, type: 'point' },
      ]);
      mockRf.getNode.mockReturnValue({ id: 'node-1', selected: true, type: 'point' });

      const { result } = renderHook(() => useGraphContextMenu({ graph: mockGraph }));

      // Open menu first
      const openEvent = {
        clientX: 500,
        clientY: 300,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: {
          closest: jest.fn().mockReturnValue({
            getAttribute: jest.fn().mockReturnValue('node-1')
          })
        }
      };
      act(() => {
        result.current.handleMultiSelectContextMenu(
          openEvent as any as React.MouseEvent
        );
      });

      expect(result.current.multiSelectMenuOpen).toBe(true);

      // Delete selected nodes
      act(() => {
        result.current.handleDeleteSelectedNodes();
      });

      expect(mockGraph.deleteNode).toHaveBeenCalledWith('node-1');
      expect(mockGraph.deleteNode).toHaveBeenCalledWith('node-2');
      expect(mockGraph.deleteNode).toHaveBeenCalledTimes(2);
      expect(result.current.multiSelectMenuOpen).toBe(false);
    });

    it('should delete selected nodes', () => {
      mockRf.getNodes.mockReturnValue([
        { id: 'node-1', selected: true, type: 'point' },
        { id: 'node-2', selected: true, type: 'point' },
      ]);

      const { result } = renderHook(() => useGraphContextMenu({ graph: mockGraph }));

      act(() => {
        result.current.handleDeleteSelectedNodes();
      });

      expect(mockGraph.deleteNode).toHaveBeenCalledWith('node-1');
      expect(mockGraph.deleteNode).toHaveBeenCalledWith('node-2');
      expect(mockGraph.deleteNode).toHaveBeenCalledTimes(2);
    });


    it('should handle mixed selection of different node types', () => {
      mockRf.getNodes.mockReturnValue([
        { id: 'point-1', selected: true, type: 'point' },
        { id: 'objection-1', selected: true, type: 'objection' },
        { id: 'comment-1', selected: true, type: 'comment' },
      ]);

      const { result } = renderHook(() => useGraphContextMenu({ graph: mockGraph }));

      act(() => {
        result.current.handleDeleteSelectedNodes();
      });

      expect(mockGraph.deleteNode).toHaveBeenCalledWith('point-1');
      expect(mockGraph.deleteNode).toHaveBeenCalledWith('objection-1');
      expect(mockGraph.deleteNode).toHaveBeenCalledWith('comment-1');
      expect(mockGraph.deleteNode).toHaveBeenCalledTimes(3);
    });

    it('should handle nodes without parent gracefully', () => {
      mockRf.getNodes.mockReturnValue([
        { id: 'node-1', selected: true, type: 'point', parentId: null },
      ]);

      const { result } = renderHook(() => useGraphContextMenu({ graph: mockGraph }));

      act(() => {
        result.current.handleDeleteSelectedNodes();
      });

      expect(mockGraph.deleteNode).toHaveBeenCalledWith('node-1');
    });

    it('should close menu after deletion', () => {
      mockRf.getNodes.mockReturnValue([
        { id: 'node-1', selected: true, type: 'point' },
        { id: 'node-2', selected: true, type: 'point' },
      ]);
      mockRf.getNode.mockReturnValue({ id: 'node-1', selected: true, type: 'point' });

      const { result } = renderHook(() => useGraphContextMenu({ graph: mockGraph }));

      // Open menu
      const openEvent = {
        clientX: 500,
        clientY: 300,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: {
          closest: jest.fn().mockReturnValue({
            getAttribute: jest.fn().mockReturnValue('node-1')
          })
        }
      };
      act(() => {
        result.current.handleMultiSelectContextMenu(
          openEvent as any as React.MouseEvent
        );
      });

      expect(result.current.multiSelectMenuOpen).toBe(true);

      // Delete
      act(() => {
        result.current.handleDeleteSelectedNodes();
      });

      expect(result.current.multiSelectMenuOpen).toBe(false);
    });

    it('should do nothing when no nodes are selected', () => {
      mockRf.getNodes.mockReturnValue([
        { id: 'node-1', selected: false, type: 'point' },
      ]);

      const { result } = renderHook(() => useGraphContextMenu({ graph: mockGraph }));

      act(() => {
        result.current.handleDeleteSelectedNodes();
      });

      expect(mockGraph.deleteNode).not.toHaveBeenCalled();
      expect(result.current.multiSelectMenuOpen).toBe(false);
    });
  });

  describe('handleAddPointToSelected', () => {
    it('passes selection ids and positions to addPointBelow', () => {
      mockGraph.addPointBelow.mockReturnValue({ nodeId: 'new-1' });
      mockRf.getNodes.mockReturnValue([
        { id: 'node-1', selected: true, type: 'point', position: { x: 10, y: 20 }, width: 120, height: 60 },
        { id: 'node-2', selected: true, type: 'statement', position: { x: 30, y: 40 }, width: 140, height: 80 },
      ]);
      mockRf.getNode.mockImplementation((id: string) => {
        if (id === 'node-1') return { id, type: 'point', position: { x: 10, y: 20 }, width: 120, height: 60 };
        if (id === 'node-2') return { id, type: 'statement', position: { x: 30, y: 40 }, width: 140, height: 80 };
        return null;
      });

      const { result } = renderHook(() => useGraphContextMenu({ graph: mockGraph }));

      act(() => {
        result.current.handleAddPointToSelected();
      });

      expect(mockGraph.addPointBelow).toHaveBeenCalledWith({
        ids: ['node-1', 'node-2'],
        positionsById: {
          'node-1': { x: 10, y: 20, width: 120, height: 60 },
          'node-2': { x: 30, y: 40, width: 140, height: 80 },
        },
      });
    });

    it('converts context reply into a comment node', () => {
      mockGraph.addPointBelow.mockReturnValue({ nodeId: 'new-comment' });
      mockRf.getNodes.mockReturnValue([
        { id: 'comment-1', selected: true, type: 'comment', position: { x: 0, y: 0 }, width: 100, height: 50 },
      ]);
      mockRf.getNode.mockImplementation((id: string) => {
        if (id === 'comment-1') return { id, type: 'comment', position: { x: 0, y: 0 }, width: 100, height: 50, selected: true };
        return null;
      });

      const { result } = renderHook(() => useGraphContextMenu({ graph: mockGraph }));

      const mockEvent = {
        clientX: 0,
        clientY: 0,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: {
          closest: jest.fn().mockReturnValue({
            getAttribute: jest.fn().mockReturnValue('comment-1'),
          }),
        },
      };

      act(() => {
        result.current.handleMultiSelectContextMenu(mockEvent as any as React.MouseEvent);
      });

      act(() => {
        result.current.handleAddPointToSelected();
      });

      expect(mockGraph.addPointBelow).toHaveBeenCalledWith({
        ids: ['comment-1'],
        positionsById: { 'comment-1': { x: 0, y: 0, width: 100, height: 50 } },
      });
      expect(mockGraph.updateNodeType).toHaveBeenCalledWith('new-comment', 'comment');
      expect(mockGraph.startEditingNode).toHaveBeenCalledWith('new-comment');
    });
  });

  describe('setMultiSelectMenuOpen', () => {
    it('should manually close the menu', () => {
      mockRf.getNodes.mockReturnValue([
        { id: 'node-1', selected: true, type: 'point' },
        { id: 'node-2', selected: true, type: 'point' },
      ]);
      mockRf.getNode.mockReturnValue({ id: 'node-1', selected: true, type: 'point' });

      const { result } = renderHook(() => useGraphContextMenu({ graph: mockGraph }));

      // Open menu
      const openEvent = {
        clientX: 500,
        clientY: 300,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: {
          closest: jest.fn().mockReturnValue({
            getAttribute: jest.fn().mockReturnValue('node-1')
          })
        }
      };
      act(() => {
        result.current.handleMultiSelectContextMenu(
          openEvent as any as React.MouseEvent
        );
      });

      expect(result.current.multiSelectMenuOpen).toBe(true);

      // Manually close
      act(() => {
        result.current.setMultiSelectMenuOpen(false);
      });

      expect(result.current.multiSelectMenuOpen).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle nodes with undefined selected property', () => {
      mockRf.getNodes.mockReturnValue([
        { id: 'node-1', type: 'point' }, // no selected property
        { id: 'node-2', selected: true, type: 'point' },
      ]);
      mockRf.getNode.mockReturnValue({ id: 'node-1', type: 'point' });

      const { result } = renderHook(() => useGraphContextMenu({ graph: mockGraph }));

      const mockEvent = {
        clientX: 500,
        clientY: 300,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: {
          closest: jest.fn().mockReturnValue({
            getAttribute: jest.fn().mockReturnValue('node-1')
          })
        }
      };

      // Should open menu when clicking on a node element
      act(() => {
        result.current.handleMultiSelectContextMenu(
          mockEvent as any as React.MouseEvent
        );
      });

      expect(result.current.multiSelectMenuOpen).toBe(true);
    });

    it('should handle missing graph.deleteNode gracefully', () => {
      const minimalGraph = {};
      mockRf.getNodes.mockReturnValue([
        { id: 'node-1', selected: true, type: 'point' },
        { id: 'node-2', selected: true, type: 'point' },
      ]);

      const { result } = renderHook(() =>
        useGraphContextMenu({ graph: minimalGraph })
      );

      // Should not throw
      expect(() => {
        act(() => {
          result.current.handleDeleteSelectedNodes();
        });
      }).not.toThrow();
    });

    it('should handle parent node not existing', () => {
      mockRf.getNodes.mockReturnValue([
        { id: 'child-1', selected: true, type: 'point', parentId: 'non-existent' },
      ]);
      mockRf.getNode.mockReturnValue(null);

      const { result } = renderHook(() => useGraphContextMenu({ graph: mockGraph }));

      act(() => {
        result.current.handleDeleteSelectedNodes();
      });

      // Should delete the child node directly since parent doesn't exist
      expect(mockGraph.deleteNode).toHaveBeenCalledWith('child-1');
    });

    it('should handle parent node that is not a group', () => {
      mockRf.getNodes.mockReturnValue([
        { id: 'child-1', selected: true, type: 'point', parentId: 'not-group' },
      ]);
      mockRf.getNode.mockReturnValue({ id: 'not-group', type: 'point' });

      const { result } = renderHook(() => useGraphContextMenu({ graph: mockGraph }));

      act(() => {
        result.current.handleDeleteSelectedNodes();
      });

      // Should delete the child node directly since parent is not a group
      expect(mockGraph.deleteNode).toHaveBeenCalledWith('child-1');
    });
  });
});
