import { MouseEvent, useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useGraphActions } from '../GraphContext';

interface UseConnectableNodeParams {
  id: string;
  locked?: boolean;
}

export const useConnectableNode = ({ id, locked = false }: UseConnectableNodeParams) => {
  const flow = useReactFlow();
  const {
    beginConnectFromNode,
    completeConnectToNode,
    connectMode,
    mindchangeMode,
    isConnectingFromNodeId,
  } = useGraphActions();

  const onClick = useCallback(
    (e: MouseEvent) => {
      if (!(connectMode || mindchangeMode) || locked) {
        return false;
      }

      e.preventDefault();
      e.stopPropagation();

      const position = flow.screenToFlowPosition({ x: e.clientX, y: e.clientY });

      if (!isConnectingFromNodeId) {
        beginConnectFromNode(id, position);
        return true;
      }

      completeConnectToNode?.(id);
      return true;
    },
    [
      beginConnectFromNode,
      completeConnectToNode,
      connectMode,
      mindchangeMode,
      flow,
      id,
      isConnectingFromNodeId,
      locked,
    ]
  );

  return {
    onClick,
  };
};

export default useConnectableNode;
