import React from 'react';
import { StraightEdge, EdgeProps } from '@xyflow/react';

export const SupportEdge: React.FC<EdgeProps> = (props) => {
    const relevance = Math.max(1, Math.min(5, ((props as any).data?.relevance ?? 3)));
    return (
        <StraightEdge
            {...props}
            style={{
                stroke: '#9CA3AF',
                strokeWidth: Math.max(1, Math.min(8, relevance * 1.4)),
                strokeDasharray: '6,6',
            }}
            interactionWidth={24}
            label="+"
            labelShowBg={false}
            labelStyle={{
                padding: 0,
                width: 20,
                height: 20,
                stroke: 'white',
                strokeWidth: 2,
                fontSize: 28,
                fontWeight: 700,
                fill: '#4B5563',
                userSelect: 'none',
            }}
        />
    );
};

export default SupportEdge;


