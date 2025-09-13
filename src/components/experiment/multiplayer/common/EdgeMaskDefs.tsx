import React from 'react';
import { useAbsoluteNodePosition } from './useAbsoluteNodePosition';
import { NodeMaskingData } from './useEdgeNodeMasking';

export interface EdgeMaskDefsProps {
  edgeId: string;
  maskingData: NodeMaskingData;
  sourceNode: any;
  targetNode: any;
  shouldRenderEllipses: boolean;
  gradientConfig?: {
    id: string;
    stops: Array<{
      offset: string;
      stopColor: string;
      stopOpacity: number;
    }>;
  };
  useEllipses?: boolean;
}

export const EdgeMaskDefs: React.FC<EdgeMaskDefsProps> = ({
  edgeId,
  maskingData,
  sourceNode,
  targetNode,
  shouldRenderEllipses,
  gradientConfig,
  useEllipses = false
}) => {
  const { getRectPosition, getEllipsePosition } = useAbsoluteNodePosition();
  const { srcLowOpacity, tgtLowOpacity } = maskingData;

  const getPointBaseRect = (node: any) => {
    if (!node?.id) return null;
    try {
      const el = document.querySelector(`.react-flow__node[data-id="${node.id}"] [data-role="content"]`) as HTMLElement | null;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      // This would need access to ReactFlow instance - keeping original logic for point nodes
      return null;
    } catch {
      return null;
    }
  };

  return (
    <defs>
      {gradientConfig && (
        <linearGradient id={gradientConfig.id} x1="0" y1="0" x2="0" y2="1">
          {gradientConfig.stops.map((stop, index) => (
            <stop
              key={index}
              offset={stop.offset}
              stopColor={stop.stopColor}
              stopOpacity={stop.stopOpacity}
            />
          ))}
        </linearGradient>
      )}
      <mask id={`edge-mask-${edgeId}`}>
        <rect x="-10000" y="-10000" width="20000" height="20000" fill="white" />
        {shouldRenderEllipses && srcLowOpacity && (() => {
          if (useEllipses) {
            const ellipsePos = getEllipsePosition(sourceNode, true);
            return ellipsePos ? (
              <ellipse
                cx={ellipsePos.cx}
                cy={ellipsePos.cy}
                rx={ellipsePos.rx}
                ry={ellipsePos.ry}
                fill="black"
              />
            ) : null;
          } else {
            const baseRect = sourceNode?.type === 'point' ? getPointBaseRect(sourceNode) : null;
            const rectPos = baseRect || getRectPosition(sourceNode, true);
            if (!rectPos) return null;
            const padY = sourceNode?.type === 'point' ? 10 : 0;
            const y = rectPos.y - padY;
            const h = rectPos.height + padY * 2;
            return (
              <rect
                x={rectPos.x}
                y={y}
                width={rectPos.width}
                height={h}
                fill="black"
              />
            );
          }
        })()}
        {shouldRenderEllipses && tgtLowOpacity && (() => {
          if (useEllipses) {
            const ellipsePos = getEllipsePosition(targetNode, true);
            return ellipsePos ? (
              <ellipse
                cx={ellipsePos.cx}
                cy={ellipsePos.cy}
                rx={ellipsePos.rx}
                ry={ellipsePos.ry}
                fill="black"
              />
            ) : null;
          } else {
            const baseRect = targetNode?.type === 'point' ? getPointBaseRect(targetNode) : null;
            const rectPos = baseRect || getRectPosition(targetNode, true);
            if (!rectPos) return null;
            const padY = targetNode?.type === 'point' ? 10 : 0;
            const y = rectPos.y - padY;
            const h = rectPos.height + padY * 2;
            return (
              <rect
                x={rectPos.x}
                y={y}
                width={rectPos.width}
                height={h}
                fill="black"
              />
            );
          }
        })()}
      </mask>
    </defs>
  );
};