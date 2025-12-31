import { useReactFlow } from "@xyflow/react";

export const useAbsoluteNodePosition = () => {
  const rf = useReactFlow();

  const getAbsoluteNodePosition = (node: any) => {
    if (!node) return { x: 0, y: 0 };

    if (node.parentId) {
      const parentNode = rf.getNode(node.parentId);
      if (parentNode) {
        return {
          x: parentNode.position.x + node.position.x,
          y: parentNode.position.y + node.position.y,
        };
      }
    }
    return node.position || { x: 0, y: 0 };
  };

  const getEllipsePosition = (node: any, isMoreNoticeable = false) => {
    if (
      !node?.measured ||
      typeof node.measured.width !== "number" ||
      typeof node.measured.height !== "number"
    ) {
      return null;
    }

    const absolutePos = getAbsoluteNodePosition(node);
    const padding = isMoreNoticeable ? 8 : 4;

    return {
      cx: absolutePos.x + node.measured.width / 2,
      cy: absolutePos.y + node.measured.height / 2,
      rx: node.measured.width / 2 + padding,
      ry: node.measured.height / 2 + padding,
    };
  };

  const getRectPosition = (node: any, isMoreNoticeable = false) => {
    const padding = isMoreNoticeable ? 4 : 2;

    // Prefer flow-space measurements to keep edge masks stable while panning/zooming.
    if (
      !node?.measured ||
      typeof node.measured.width !== "number" ||
      typeof node.measured.height !== "number"
    ) {
      try {
        const el = document.querySelector(
          `.react-flow__node[data-id="${node?.id}"]`
        ) as HTMLElement | null;
        if (el) {
          const rect = el.getBoundingClientRect();
          const tl = rf.screenToFlowPosition({ x: rect.left, y: rect.top });
          const br = rf.screenToFlowPosition({ x: rect.right, y: rect.bottom });
          const x = Math.min(tl.x, br.x) - padding;
          const y = Math.min(tl.y, br.y) - padding;
          const width = Math.abs(br.x - tl.x) + padding * 2;
          const height = Math.abs(br.y - tl.y) + padding * 2;

          const computedStyle = window.getComputedStyle(el);
          const borderRadiusPx = parseFloat(computedStyle.borderRadius) || 0;
          const viewport = rf.getViewport();
          const borderRadius = borderRadiusPx / (viewport.zoom || 1);

          if (
            Number.isFinite(width) &&
            Number.isFinite(height) &&
            width > 0 &&
            height > 0
          ) {
            return { x, y, width, height, borderRadius };
          }
        }
      } catch {}
      return null;
    }
    const absolutePos = node.positionAbsolute ?? getAbsoluteNodePosition(node);
    return {
      x: absolutePos.x - padding,
      y: absolutePos.y - padding,
      width: node.measured.width + padding * 2,
      height: node.measured.height + padding * 2,
      borderRadius: 0,
    };
  };

  return { getAbsoluteNodePosition, getEllipsePosition, getRectPosition };
};
