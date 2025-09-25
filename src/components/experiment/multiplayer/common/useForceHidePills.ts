import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";

import { useGraphActions } from "../GraphContext";

export interface PillForceHideParams {
  id: string;
  hidePill?: () => void;
  onPillMouseLeave?: () => void;
  onHoverLeave: () => void;
}

export const useForceHidePills = ({
  id,
  hidePill,
  onPillMouseLeave,
  onHoverLeave,
}: PillForceHideParams) => {
  const reactFlow = useReactFlow();
  const { setHoveredNodeId } = useGraphActions() as any;

  return useCallback(() => {
    hidePill?.();
    onPillMouseLeave?.();
    onHoverLeave();
    setHoveredNodeId?.(null);
    try {
      reactFlow.setNodes((nodes: any[]) =>
        nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                selected: false,
              }
            : node
        )
      );
    } catch {}
  }, [
    hidePill,
    onPillMouseLeave,
    onHoverLeave,
    setHoveredNodeId,
    reactFlow,
    id,
  ]);
};
