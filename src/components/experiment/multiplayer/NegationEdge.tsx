import React from 'react';
import { EdgeProps } from '@xyflow/react';
import { BaseEdge } from './common/BaseEdge';

export const NegationEdge: React.FC<EdgeProps> = (props) => {
  return <BaseEdge {...props} edgeType="negation" />;
};

