import { useState, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";

export function calculateInitialLayout(
  parentX: number,
  parentY: number,
  parentHeight: number,
  count: number,
  spacing = 250,
  verticalOffset = 200
): Array<{ x: number; y: number }> {
  if (count === 0) return [];

  if (count === 1) {
    return [{ x: parentX, y: parentY + parentHeight + verticalOffset }];
  }

  const positions: Array<{ x: number; y: number }> = [];

  const totalWidth = (count - 1) * spacing;
  const startX = parentX - totalWidth / 2;

  const dynamicVerticalOffset =
    verticalOffset + (count > 2 ? (count - 2) * 50 : 0);

  for (let i = 0; i < count; i++) {
    const progress = count > 1 ? i / (count - 1) : 0;
    const x = startX + progress * totalWidth;

    const arcHeight = 80 * Math.sin(Math.PI * progress);
    const horizontalVariation = (progress - 0.5) * 120;

    const y = parentY + parentHeight + dynamicVerticalOffset + arcHeight;
    const adjustedX = x + horizontalVariation;

    positions.push({ x: adjustedX, y });
  }

  return positions;
}

interface UseExpandPointDialogLayoutProps {
  isOpen: boolean;
  parentNodeId: string | null;
  isMobile: boolean;
  modalHeight: number;
}

export const useExpandPointDialogLayout = ({
  isOpen,
  parentNodeId,
  isMobile,
  modalHeight,
}: UseExpandPointDialogLayoutProps) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [modalSize, setModalSize] = useState({ width: 450, height: 550 });
  const { getNode, getViewport } = useReactFlow();

  useEffect(() => {
    if (!isOpen || !parentNodeId) return;

    if (isMobile) {
      const parentNode = getNode(parentNodeId);
      const { x: viewportX, y: viewportY, zoom } = getViewport();
      const dialogWidth = Math.min(window.innerWidth - 20, 350);

      if (parentNode) {
        const transformedX = parentNode.position.x * zoom + viewportX;
        const transformedY = parentNode.position.y * zoom + viewportY;
        const nodeHeight = parentNode?.measured?.height || 100;
        const spaceBelow =
          window.innerHeight - transformedY - nodeHeight * zoom - 20;
        const spaceAbove = transformedY - 20;
        const placeBelow = spaceBelow >= 250 || spaceBelow > spaceAbove;
        const centerX =
          transformedX +
          ((parentNode.width || 200) * zoom) / 2 -
          dialogWidth / 2;
        const dialogX = Math.max(
          10,
          Math.min(window.innerWidth - dialogWidth - 10, centerX)
        );
        const dialogY = placeBelow
          ? transformedY + nodeHeight * zoom + 10
          : Math.max(
              10,
              transformedY - 10 - (placeBelow ? 0 : Math.min(400, spaceAbove))
            );

        setModalSize({
          width: dialogWidth,
          height: Math.min(400, window.innerHeight * 0.6),
        });
        setPosition({ x: dialogX, y: dialogY });
      } else {
        setModalSize({
          width: dialogWidth,
          height: Math.min(400, window.innerHeight - 160),
        });
        setPosition({
          x: (window.innerWidth - dialogWidth) / 2,
          y: 80,
        });
      }
    } else {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const dialogWidth = Math.min(480, window.innerWidth - 40);
      setModalSize((prev) => ({
        ...prev,
        width: dialogWidth,
        height: modalHeight,
      }));

      const rightPadding = 20;
      const bottomPadding = 20;
      const xPos = viewportWidth - dialogWidth - rightPadding;
      const yPos = viewportHeight - modalHeight - bottomPadding;

      setPosition({
        x: Math.max(20, xPos),
        y: Math.max(20, yPos),
      });
    }
  }, [isOpen, isMobile, parentNodeId, getNode, modalHeight, getViewport]);

  return { position, modalSize, setPosition, setModalSize };
};
