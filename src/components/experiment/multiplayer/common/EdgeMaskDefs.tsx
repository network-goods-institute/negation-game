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
}

export const EdgeMaskDefs: React.FC<EdgeMaskDefsProps> = ({
  edgeId,
  maskingData,
  sourceNode,
  targetNode,
  shouldRenderEllipses,
  gradientConfig
}) => {
  const { getRectPosition } = useAbsoluteNodePosition();
  const { srcLowOpacity, tgtLowOpacity } = maskingData;


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
          const rectPos = getRectPosition(sourceNode, false);
          if (!rectPos) return null;
          return (
            <rect
              x={rectPos.x}
              y={rectPos.y}
              width={rectPos.width}
              height={rectPos.height}
              fill="black"
            />
          );
        })()}
        {shouldRenderEllipses && tgtLowOpacity && (() => {
          const rectPos = getRectPosition(targetNode, false);
          if (!rectPos) return null;
          return (
            <rect
              x={rectPos.x}
              y={rectPos.y}
              width={rectPos.width}
              height={rectPos.height}
              fill="black"
            />
          );
        })()}
      </mask>
    </defs>
  );
};