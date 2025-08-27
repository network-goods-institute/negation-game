import { MouseEvent, useCallback } from 'react';
import { useGraphActions } from '../GraphContext';

interface UseConnectableNodeParams {
  id: string;
  locked?: boolean;
}

export const useConnectableNode = ({ id, locked = false }: UseConnectableNodeParams) => {
  const { beginConnectFromNode, completeConnectToNode, connectMode, isConnectingFromNodeId } = useGraphActions();

  const onMouseDown = useCallback((e: MouseEvent) => {
    if (e.button === 2) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (e.button === 0 && connectMode && !locked) {
      e.preventDefault();
      e.stopPropagation();
      beginConnectFromNode(id);
    }
  }, [beginConnectFromNode, connectMode, id, locked]);

  const onMouseUp = useCallback((e: MouseEvent) => {
    if (connectMode && !locked) {
      e.preventDefault();
      e.stopPropagation();
      if (isConnectingFromNodeId && isConnectingFromNodeId !== id) {
        completeConnectToNode?.(id);
      }
    }
  }, [completeConnectToNode, connectMode, id, isConnectingFromNodeId, locked]);

  const onClick = useCallback((e: MouseEvent) => {
    if (connectMode) {
      e.stopPropagation();
    }
  }, [connectMode]);

  return { onMouseDown, onMouseUp, onClick };
};

export default useConnectableNode;

