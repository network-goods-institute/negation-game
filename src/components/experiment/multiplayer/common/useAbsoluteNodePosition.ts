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
          y: parentNode.position.y + node.position.y
        };
      }
    }
    return node.position || { x: 0, y: 0 };
  };
  
  const getEllipsePosition = (node: any, isMoreNoticeable = false) => {
    if (!node?.measured || typeof node.measured.width !== 'number' || typeof node.measured.height !== 'number') {
      return null;
    }
    
    const absolutePos = getAbsoluteNodePosition(node);
    const padding = isMoreNoticeable ? 8 : 4;
    
    return {
      cx: absolutePos.x + (node.measured.width / 2),
      cy: absolutePos.y + (node.measured.height / 2),
      rx: (node.measured.width / 2) + padding,
      ry: (node.measured.height / 2) + padding
    };
  };
  
  const getRectPosition = (node: any, isMoreNoticeable = false) => {
    if (!node?.measured || typeof node.measured.width !== 'number' || typeof node.measured.height !== 'number') {
      return null;
    }
    
    const absolutePos = getAbsoluteNodePosition(node);
    const padding = isMoreNoticeable ? 4 : 2;
    
    return {
      x: absolutePos.x - padding,
      y: absolutePos.y - padding,
      width: node.measured.width + (padding * 2),
      height: node.measured.height + (padding * 2)
    };
  };
  
  return { getAbsoluteNodePosition, getEllipsePosition, getRectPosition };
};