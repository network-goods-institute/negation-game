import React from 'react';

/**
 * Defines SVG arrow markers for mindchange edges.
 * These markers are added to edges when mindchange data is present.
 */
export const EdgeArrowMarkers: React.FC = () => {
  return (
    <defs>
      {/* Gray half-arrows for negation, support edges */}
      <marker
        id="arrow-gray"
        viewBox="0 0 24 24"
        refX="22"
        refY="12"
        markerWidth="16"
        markerHeight="16"
        markerUnits="strokeWidth"
        orient="auto-start-reverse"
      >
        <line x1="8" y1="14" x2="22" y2="12" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="butt" shapeRendering="crispEdges" />
        <line x1="22" y1="12" x2="0" y2="12" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="butt" shapeRendering="crispEdges" />
      </marker>

      {/* Primary color half-arrows for option edges */}
      <marker
        id="arrow-primary"
        viewBox="0 0 24 24"
        refX="22"
        refY="12"
        markerWidth="16"
        markerHeight="16"
        markerUnits="strokeWidth"
        orient="auto-start-reverse"
      >
        <line x1="8" y1="14" x2="22" y2="12" stroke="hsl(var(--sync-primary))" strokeWidth="2" strokeLinecap="butt" shapeRendering="crispEdges" />
        <line x1="22" y1="12" x2="0" y2="12" stroke="hsl(var(--sync-primary))" strokeWidth="2" strokeLinecap="butt" shapeRendering="crispEdges" />
      </marker>

      {/* Dark gray half-arrows for statement edges */}
      <marker
        id="arrow-dark-gray"
        viewBox="0 0 24 24"
        refX="22"
        refY="12"
        markerWidth="16"
        markerHeight="16"
        markerUnits="strokeWidth"
        orient="auto-start-reverse"
      >
        <line x1="8" y1="14" x2="22" y2="12" stroke="#6b7280" strokeWidth="2" strokeLinecap="butt" shapeRendering="crispEdges" />
        <line x1="22" y1="12" x2="0" y2="12" stroke="#6b7280" strokeWidth="2" strokeLinecap="butt" shapeRendering="crispEdges" />
      </marker>
    </defs>
  );
};

/**
 * Returns the appropriate marker ID for a given edge type
 * Returns null for objection edges (they don't get arrows)
 */
export const getMarkerIdForEdgeType = (edgeType: string): string | null => {
  switch (edgeType) {
    case 'negation':
    case 'support':
      return 'arrow-gray';
    case 'objection':
      return null; // Objections don't get mindchange arrows
    case 'option':
      return 'arrow-primary';
    case 'statement':
      return 'arrow-dark-gray';
    default:
      return 'arrow-gray';
  }
};
