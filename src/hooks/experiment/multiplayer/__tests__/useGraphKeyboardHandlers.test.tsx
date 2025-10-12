import { renderHook } from '@testing-library/react';
import { useReactFlow } from '@xyflow/react';
import { toast } from 'sonner';
import { useGraphKeyboardHandlers } from '../useGraphKeyboardHandlers';

jest.mock('@xyflow/react');
jest.mock('sonner');

describe('useGraphKeyboardHandlers', () => {
  const mockGraph = {
    isAnyNodeEditing: false,
    selectedEdgeId: null,
    deleteNode: jest.fn(),
    setSelectedEdge: jest.fn(),
    clearNodeSelection: jest.fn(),
    duplicateNodeWithConnections: jest.fn(),
  };

  const mockRf = {
    getNodes: jest.fn(),
    getNode: jest.fn(),
  };

  const copiedNodeIdRef = { current: null };

  beforeEach(() => {
    jest.clearAllMocks();
    (useReactFlow as jest.Mock).mockReturnValue(mockRf);
    mockRf.getNodes.mockReturnValue([]);
  });

  afterEach(() => {
    // Clean up event listeners
    const listeners = (global as any).eventListeners || [];
    listeners.forEach((listener: any) => {
      window.removeEventListener(listener.type, listener.fn);
    });
  });

  it('should register keydown event listener', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

    renderHook(() =>
      useGraphKeyboardHandlers({ graph: mockGraph, copiedNodeIdRef })
    );

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function),
      { capture: true }
    );
  });

  describe('Delete key handling', () => {
    it('should delete selected edge when edge is selected', () => {
      const graphWithEdge = { ...mockGraph, selectedEdgeId: 'edge-1' };

      renderHook(() =>
        useGraphKeyboardHandlers({ graph: graphWithEdge, copiedNodeIdRef })
      );

      const deleteEvent = new KeyboardEvent('keydown', { key: 'Delete' });
      Object.defineProperty(deleteEvent, 'preventDefault', {
        value: jest.fn(),
      });
      window.dispatchEvent(deleteEvent);

      expect(graphWithEdge.deleteNode).toHaveBeenCalledWith('edge-1');
      expect(graphWithEdge.setSelectedEdge).toHaveBeenCalledWith(null);
    });

    it('should delete selected nodes', () => {
      const mockNodes = [
        { id: 'node-1', selected: true, type: 'point' },
        { id: 'node-2', selected: false, type: 'point' },
      ];
      mockRf.getNodes.mockReturnValue(mockNodes);

      renderHook(() =>
        useGraphKeyboardHandlers({ graph: mockGraph, copiedNodeIdRef })
      );

      const deleteEvent = new KeyboardEvent('keydown', { key: 'Delete' });
      Object.defineProperty(deleteEvent, 'preventDefault', {
        value: jest.fn(),
      });
      window.dispatchEvent(deleteEvent);

      expect(mockGraph.deleteNode).toHaveBeenCalledWith('node-1');
      expect(mockGraph.deleteNode).toHaveBeenCalledTimes(1);
    });

    it('should delete group node when child node is selected', () => {
      const mockNodes = [
        { id: 'child-1', selected: true, type: 'point', parentId: 'group-1' },
      ];
      mockRf.getNodes.mockReturnValue(mockNodes);
      mockRf.getNode.mockReturnValue({ id: 'group-1', type: 'group' });

      renderHook(() =>
        useGraphKeyboardHandlers({ graph: mockGraph, copiedNodeIdRef })
      );

      const deleteEvent = new KeyboardEvent('keydown', { key: 'Delete' });
      Object.defineProperty(deleteEvent, 'preventDefault', {
        value: jest.fn(),
      });
      window.dispatchEvent(deleteEvent);

      expect(mockGraph.deleteNode).toHaveBeenCalledWith('group-1');
    });

    it('should not delete when a node is being edited', () => {
      const graphWithEditing = { ...mockGraph, isAnyNodeEditing: true };

      renderHook(() =>
        useGraphKeyboardHandlers({
          graph: graphWithEditing,
          copiedNodeIdRef,
        })
      );

      const deleteEvent = new KeyboardEvent('keydown', { key: 'Delete' });
      const preventDefaultSpy = jest.fn();
      Object.defineProperty(deleteEvent, 'preventDefault', {
        value: preventDefaultSpy,
      });
      window.dispatchEvent(deleteEvent);

      expect(mockGraph.deleteNode).not.toHaveBeenCalled();
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should handle backspace key as delete', () => {
      const graphWithEdge = { ...mockGraph, selectedEdgeId: 'edge-1' };

      renderHook(() =>
        useGraphKeyboardHandlers({ graph: graphWithEdge, copiedNodeIdRef })
      );

      const backspaceEvent = new KeyboardEvent('keydown', { key: 'Backspace' });
      Object.defineProperty(backspaceEvent, 'preventDefault', {
        value: jest.fn(),
      });
      window.dispatchEvent(backspaceEvent);

      expect(graphWithEdge.deleteNode).toHaveBeenCalledWith('edge-1');
    });
  });

  describe('Escape key handling', () => {
    it('should clear node selection and deselect edge', () => {
      renderHook(() =>
        useGraphKeyboardHandlers({ graph: mockGraph, copiedNodeIdRef })
      );

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      const preventDefaultSpy = jest.fn();
      Object.defineProperty(escapeEvent, 'preventDefault', {
        value: preventDefaultSpy,
      });
      window.dispatchEvent(escapeEvent);

      expect(mockGraph.clearNodeSelection).toHaveBeenCalled();
      expect(mockGraph.setSelectedEdge).toHaveBeenCalledWith(null);
      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Copy (Cmd+C) handling', () => {
    it('should copy a single point node', () => {
      const mockNodes = [{ id: 'point-1', selected: true, type: 'point' }];
      mockRf.getNodes.mockReturnValue(mockNodes);

      renderHook(() =>
        useGraphKeyboardHandlers({ graph: mockGraph, copiedNodeIdRef })
      );

      const copyEvent = new KeyboardEvent('keydown', {
        key: 'c',
        metaKey: true,
      });
      const preventDefaultSpy = jest.fn();
      const stopPropagationSpy = jest.fn();
      Object.defineProperty(copyEvent, 'preventDefault', {
        value: preventDefaultSpy,
      });
      Object.defineProperty(copyEvent, 'stopPropagation', {
        value: stopPropagationSpy,
      });
      window.dispatchEvent(copyEvent);

      expect(copiedNodeIdRef.current).toBe('point-1');
      expect(toast.success).toHaveBeenCalledWith('Copied node');
      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
    });

    it('should not copy non-point/objection nodes', () => {
      const mockNodes = [{ id: 'group-1', selected: true, type: 'group' }];
      mockRf.getNodes.mockReturnValue(mockNodes);

      const ref = { current: null };
      renderHook(() =>
        useGraphKeyboardHandlers({ graph: mockGraph, copiedNodeIdRef: ref })
      );

      const copyEvent = new KeyboardEvent('keydown', {
        key: 'c',
        metaKey: true,
      });
      window.dispatchEvent(copyEvent);

      expect(ref.current).toBe(null);
      expect(toast.success).not.toHaveBeenCalled();
    });

    it('should not copy when multiple nodes are selected', () => {
      const mockNodes = [
        { id: 'point-1', selected: true, type: 'point' },
        { id: 'point-2', selected: true, type: 'point' },
      ];
      mockRf.getNodes.mockReturnValue(mockNodes);

      const ref = { current: null };
      renderHook(() =>
        useGraphKeyboardHandlers({ graph: mockGraph, copiedNodeIdRef: ref })
      );

      const copyEvent = new KeyboardEvent('keydown', {
        key: 'c',
        metaKey: true,
      });
      window.dispatchEvent(copyEvent);

      expect(ref.current).toBe(null);
      expect(toast.success).not.toHaveBeenCalled();
    });
  });

  describe('Paste (Cmd+V) handling', () => {
    it('should duplicate node when valid node is copied', () => {
      const ref = { current: 'point-1' };
      mockRf.getNode.mockReturnValue({ id: 'point-1', type: 'point' });
      mockGraph.duplicateNodeWithConnections.mockReturnValue('point-2');

      renderHook(() =>
        useGraphKeyboardHandlers({ graph: mockGraph, copiedNodeIdRef: ref })
      );

      const pasteEvent = new KeyboardEvent('keydown', {
        key: 'v',
        metaKey: true,
      });
      const preventDefaultSpy = jest.fn();
      const stopPropagationSpy = jest.fn();
      Object.defineProperty(pasteEvent, 'preventDefault', {
        value: preventDefaultSpy,
      });
      Object.defineProperty(pasteEvent, 'stopPropagation', {
        value: stopPropagationSpy,
      });
      window.dispatchEvent(pasteEvent);

      expect(mockGraph.duplicateNodeWithConnections).toHaveBeenCalledWith(
        'point-1',
        { x: 16, y: 16 }
      );
      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
    });

    it('should not duplicate when copied node does not exist', () => {
      const ref = { current: 'non-existent' };
      mockRf.getNode.mockReturnValue(null);

      renderHook(() =>
        useGraphKeyboardHandlers({ graph: mockGraph, copiedNodeIdRef: ref })
      );

      const pasteEvent = new KeyboardEvent('keydown', {
        key: 'v',
        metaKey: true,
      });
      window.dispatchEvent(pasteEvent);

      expect(mockGraph.duplicateNodeWithConnections).not.toHaveBeenCalled();
    });
  });

  describe('Editable element handling', () => {
    it('should not handle keyboard events when input is focused', () => {
      renderHook(() =>
        useGraphKeyboardHandlers({ graph: mockGraph, copiedNodeIdRef })
      );

      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      const deleteEvent = new KeyboardEvent('keydown', {
        key: 'Delete',
        bubbles: true,
      });
      Object.defineProperty(deleteEvent, 'target', { value: input });
      input.dispatchEvent(deleteEvent);

      expect(mockGraph.deleteNode).not.toHaveBeenCalled();

      document.body.removeChild(input);
    });

    it('should not handle keyboard events when text is selected', () => {
      const getSelectionMock = jest.fn().mockReturnValue({
        isCollapsed: false,
      });
      Object.defineProperty(window, 'getSelection', {
        value: getSelectionMock,
        writable: true,
      });

      renderHook(() =>
        useGraphKeyboardHandlers({ graph: mockGraph, copiedNodeIdRef })
      );

      const deleteEvent = new KeyboardEvent('keydown', { key: 'Delete' });
      window.dispatchEvent(deleteEvent);

      expect(mockGraph.deleteNode).not.toHaveBeenCalled();
    });
  });

  describe('Ctrl key support', () => {
    it('should handle Ctrl+C on non-Mac systems', () => {
      const mockNodes = [{ id: 'point-1', selected: true, type: 'point' }];
      mockRf.getNodes.mockReturnValue(mockNodes);

      // Mock getSelection to return collapsed selection
      const mockGetSelection = jest.fn().mockReturnValue({
        isCollapsed: true,
      });
      Object.defineProperty(window, 'getSelection', {
        value: mockGetSelection,
        writable: true,
      });

      const ref = { current: null };
      renderHook(() =>
        useGraphKeyboardHandlers({ graph: mockGraph, copiedNodeIdRef: ref })
      );

      const copyEvent = new KeyboardEvent('keydown', {
        key: 'c',
        ctrlKey: true,
        bubbles: true,
      });
      const preventDefaultSpy = jest.fn();
      const stopPropagationSpy = jest.fn();
      Object.defineProperty(copyEvent, 'preventDefault', {
        value: preventDefaultSpy,
      });
      Object.defineProperty(copyEvent, 'stopPropagation', {
        value: stopPropagationSpy,
      });
      Object.defineProperty(copyEvent, 'target', {
        value: document.body,
        writable: true,
      });
      window.dispatchEvent(copyEvent);

      expect(ref.current).toBe('point-1');
      expect(toast.success).toHaveBeenCalledWith('Copied node');
    });
  });
});
