import React from 'react';
import { BezierEdge, StraightEdge } from '@xyflow/react';
interface MainEdgeRendererProps {
  useBezier: boolean;
  curvature?: number;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourceNode: any;
  targetNode: any;
  edgeType: string;
  edgeStylesWithPointer: any;
  props: any;
  interactionWidth?: number;
  label?: string;
  labelStyle?: any;
  labelX: number;
  labelY: number;
}

export const MainEdgeRenderer: React.FC<MainEdgeRendererProps> = ({
  useBezier,
  curvature,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourceNode,
  targetNode,
  edgeType,
  edgeStylesWithPointer,
  props,
  interactionWidth,
  label,
  labelStyle,
}) => {
  // Simple edge renderer without mindchange logic
  if (useBezier) {
    return (
      <BezierEdge
        {...props}
        style={edgeStylesWithPointer}
        label={label}
        labelStyle={labelStyle}
      />
    );
  } else {
    return (
      <StraightEdge
        {...props}
        style={edgeStylesWithPointer}
        label={label}
        labelStyle={labelStyle}
      />
    );
  }
};
