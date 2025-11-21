import { renderHook, act } from '@testing-library/react';
import { useReactFlow } from '@xyflow/react';
import { useGraphContextMenu } from '../useGraphContextMenu';

jest.mock('@xyflow/react');

describe('useGraphContextMenu', () => {
  const mockGraph = {
    deleteNode: jest.fn(),
  };

  const mockRf = {
    getNodes: jest.fn(),
    getNode: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
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

    it('should delete group node when child is selected', () => {
      mockRf.getNodes.mockReturnValue([
        { id: 'child-1', selected: true, type: 'point', parentId: 'group-1' },
        { id: 'child-2', selected: true, type: 'point', parentId: 'group-1' },
      ]);
      mockRf.getNode.mockReturnValue({ id: 'group-1', type: 'group' });

      const { result } = renderHook(() => useGraphContextMenu({ graph: mockGraph }));

      act(() => {
        result.current.handleDeleteSelectedNodes();
      });

      // Should delete the group, not the children individually
      expect(mockGraph.deleteNode).toHaveBeenCalledWith('group-1');
      expect(mockGraph.deleteNode).toHaveBeenCalledTimes(1);
    });

    it('should delete group node directly when selected', () => {
      mockRf.getNodes.mockReturnValue([
        { id: 'group-1', selected: true, type: 'group' },
        { id: 'child-1', selected: true, type: 'point', parentId: 'group-1' },
      ]);

      const { result } = renderHook(() => useGraphContextMenu({ graph: mockGraph }));

      act(() => {
        result.current.handleDeleteSelectedNodes();
      });

      expect(mockGraph.deleteNode).toHaveBeenCalledWith('group-1');
      expect(mockGraph.deleteNode).toHaveBeenCalledTimes(1);
    });

    it('should handle mixed selection of regular and group nodes', () => {
      mockRf.getNodes.mockReturnValue([
        { id: 'point-1', selected: true, type: 'point' },
        { id: 'group-1', selected: true, type: 'group' },
        { id: 'child-1', selected: true, type: 'point', parentId: 'group-2' },
      ]);
      mockRf.getNode.mockImplementation((id) => {
        if (id === 'group-2') return { id: 'group-2', type: 'group' };
        return null;
      });

      const { result } = renderHook(() => useGraphContextMenu({ graph: mockGraph }));

      act(() => {
        result.current.handleDeleteSelectedNodes();
      });

      expect(mockGraph.deleteNode).toHaveBeenCalledWith('point-1');
      expect(mockGraph.deleteNode).toHaveBeenCalledWith('group-1');
      expect(mockGraph.deleteNode).toHaveBeenCalledWith('group-2');
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
