import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';

interface NodeDimensions {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SelectionPayload {
  ids: string[];
  positionsById: Record<string, NodeDimensions>;
  nodes: any[];
}

/**
 * Shared hook for building selection payload with node positions and dimensions
 * Used by PointNode, StatementNode, CommentNode, and ObjectionNode for multi-selection
 */
export const useSelectionPayload = (
  nodeId: string,
  getSelectedNodes: () => any[]
): (() => SelectionPayload) => {
  const rf = useReactFlow();

  return useCallback(() => {
    const current = getSelectedNodes();
    const ids = current.length > 1 ? current.map((n: any) => n.id) : [nodeId];

    const positionsById = ids.reduce<Record<string, NodeDimensions>>(
      (acc, nid) => {
        const fromList = current.find((n: any) => n.id === nid) as any | undefined;
        const fromRf = rf.getNode(nid) as any | undefined;

        const x = Number.isFinite(fromList?.position?.x)
          ? fromList.position.x
          : Number.isFinite(fromRf?.position?.x)
          ? fromRf.position.x
          : 0;
        const y = Number.isFinite(fromList?.position?.y)
          ? fromList.position.y
          : Number.isFinite(fromRf?.position?.y)
          ? fromRf.position.y
          : 0;

        // Try to get width/height from node data first
        let width =
          Number(fromList?.width ?? fromList?.measured?.width ?? fromRf?.width ?? fromRf?.measured?.width ?? 0) || 0;
        let height =
          Number(fromList?.height ?? fromList?.measured?.height ?? fromRf?.height ?? fromRf?.measured?.height ?? 0) ||
          0;

        // If not available, get actual dimensions from DOM
        if (!width || !height) {
          try {
            const selector = `.react-flow__node[data-id="${nid}"]`;
            const el = document.querySelector(selector) as HTMLElement | null;
            if (el) {
              const rect = el.getBoundingClientRect();
              if (!width) width = Math.ceil(rect.width);
              if (!height) height = Math.ceil(rect.height);
            }
          } catch {}
        }

        // Fallback defaults
        if (!width) width = 240;
        if (!height) height = 80;

        acc[nid] = { x, y, width, height };
        return acc;
      },
      {}
    );

    return { ids, positionsById, nodes: current };
  }, [getSelectedNodes, nodeId, rf]);
};
