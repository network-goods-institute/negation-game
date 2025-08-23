import React from 'react';
import { BezierEdge, EdgeProps } from '@xyflow/react';

export const NegationEdge: React.FC<EdgeProps> = (props) => {
  return (
    <BezierEdge
      {...props}
      style={{
        strokeWidth: 2,
        stroke: "#ef4444",
      }}
      label="-"
      labelShowBg={false}
      labelStyle={{
        padding: 0,
        width: 20,
        height: 20,
        stroke: "white",
        strokeWidth: 2,
        fontSize: 36,
        fontWeight: 600,
        fill: "#ef4444",
      }}
    />
  );
};