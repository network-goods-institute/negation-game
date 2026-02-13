import React from 'react';
import { BezierEdge, StraightEdge, Position } from '@xyflow/react';
import { EdgeRouting } from './EdgeConfiguration';

interface MainEdgeRendererProps {
  useBezier: boolean;
  routing?: EdgeRouting;
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
  orthogonalPath?: string;
}

export const MainEdgeRenderer: React.FC<MainEdgeRendererProps> = ({
  useBezier,
  routing,
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
  orthogonalPath,
}) => {
  if (routing === 'orthogonal' && orthogonalPath) {
    return (
      <path
        d={orthogonalPath}
        style={edgeStylesWithPointer}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd={props.markerEnd}
        markerStart={props.markerStart}
      />
    );
  }

  if (useBezier) {
    let edgeProps = { ...props };

    if (edgeType === 'objection') {
      const objectionY = sourceNode?.position?.y ?? 0;
      const anchorY = targetNode?.position?.y ?? 0;
      edgeProps = {
        ...edgeProps,
        sourcePosition: objectionY < anchorY ? Position.Bottom : Position.Top,
        targetPosition: objectionY > anchorY ? Position.Bottom : Position.Top,
      };
    }

    return (
      <BezierEdge
        {...edgeProps}
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
