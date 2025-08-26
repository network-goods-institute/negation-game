import { useState, useEffect } from 'react';
import { generateEdgeId } from '@/utils/experiment/multiplayer/graphSync';

export const useInitialGraph = () => {
  const [initialGraph, setInitialGraph] = useState<{ nodes: any[]; edges: any[] } | null>(null);
  
  useEffect(() => {
    if (initialGraph) return;
    
    const statementId = 'statement';
    const pointId = `p-${Date.now()}`;
    
    setInitialGraph({
      nodes: [
        { id: statementId, type: 'statement', position: { x: 250, y: 200 }, data: { statement: 'New Rationale' } },
        { id: pointId, type: 'point', position: { x: 250, y: 360 }, data: { content: 'First point' } },
      ],
      edges: [
        { 
          id: generateEdgeId(), 
          type: 'statement', 
          source: pointId, 
          target: statementId, 
          sourceHandle: `${pointId}-source-handle`, 
          targetHandle: `${statementId}-incoming-handle` 
        },
      ],
    });
  }, [initialGraph]);
  
  return initialGraph;
};