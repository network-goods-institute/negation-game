import React from 'react';

/**
 * Defines SVG arrow markers for mindchange edges.
 * Simple triangular arrowheads - one lane gets arrow at target, other lane at source.
 */
export const EdgeArrowMarkers: React.FC = () => {
  return (
    <defs>
      {/* Objection arrows - orange */}
      <marker
        id="arrow-objection"
        viewBox="0 0 10 10"
        refX="10"
        refY="5"
        markerWidth="10"
        markerHeight="10"
        markerUnits="userSpaceOnUse"
        orient="auto"
      >
        <path d="M 0 0 L 10 5 L 0 10 Z" fill="#f97316" />
      </marker>

      {/* Gray arrows for negation, support edges */}
      <marker
        id="arrow-gray"
        viewBox="0 0 10 10"
        refX="10"
        refY="5"
        markerWidth="10"
        markerHeight="10"
        markerUnits="userSpaceOnUse"
        orient="auto"
      >
        <path d="M 0 0 L 10 5 L 0 10 Z" fill="#9CA3AF" />
      </marker>

      {/* Primary color arrows for option edges */}
      <marker
        id="arrow-primary"
        viewBox="0 0 10 10"
        refX="10"
        refY="5"
        markerWidth="10"
        markerHeight="10"
        markerUnits="userSpaceOnUse"
        orient="auto"
      >
        <path d="M 0 0 L 10 5 L 0 10 Z" fill="hsl(var(--sync-primary))" />
      </marker>

      {/* Dark gray arrows for statement edges */}
      <marker
        id="arrow-dark-gray"
        viewBox="0 0 10 10"
        refX="10"
        refY="5"
        markerWidth="10"
        markerHeight="10"
        markerUnits="userSpaceOnUse"
        orient="auto"
      >
        <path d="M 0 0 L 10 5 L 0 10 Z" fill="#6b7280" />
      </marker>
    </defs>
  );
};

/**
 * Returns the appropriate marker ID for a given edge type
 */
export const getMarkerIdForEdgeType = (edgeType: string): string | null => {
  switch (edgeType) {
    case 'negation':
    case 'support':
      return 'arrow-gray';
    case 'objection':
      return 'arrow-objection';
    case 'option':
      return 'arrow-primary';
    case 'statement':
      return 'arrow-dark-gray';
    default:
      return 'arrow-gray';
  }
};
