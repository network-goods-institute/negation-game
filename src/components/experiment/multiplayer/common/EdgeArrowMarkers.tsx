import React from 'react';

/**
 * Defines SVG arrow markers for mindchange edges.
 * Simple triangular arrowheads - one lane gets arrow at target, other lane at source.
 */
export const EdgeArrowMarkers: React.FC = () => {
  return (
    <defs>
      <marker
        id="arrow-objection"
        viewBox="0 0 10 10"
        refX="10"
        refY="5"
        markerWidth="10"
        markerHeight="10"
        markerUnits="userSpaceOnUse"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 Z" fill="#f97316" />
      </marker>

      <marker
        id="arrow-negation"
        viewBox="0 0 10 10"
        refX="10"
        refY="5"
        markerWidth="10"
        markerHeight="10"
        markerUnits="userSpaceOnUse"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 Z" fill="#f43f5e" />
      </marker>

      <marker
        id="arrow-support"
        viewBox="0 0 10 10"
        refX="10"
        refY="5"
        markerWidth="10"
        markerHeight="10"
        markerUnits="userSpaceOnUse"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 Z" fill="#10b981" />
      </marker>

      <marker
        id="arrow-primary"
        viewBox="0 0 10 10"
        refX="10"
        refY="5"
        markerWidth="10"
        markerHeight="10"
        markerUnits="userSpaceOnUse"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 Z" fill="hsl(var(--sync-primary))" />
      </marker>

      <marker
        id="arrow-dark-gray"
        viewBox="0 0 10 10"
        refX="10"
        refY="5"
        markerWidth="10"
        markerHeight="10"
        markerUnits="userSpaceOnUse"
        orient="auto-start-reverse"
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
      return 'arrow-negation';
    case 'support':
      return 'arrow-support';
    case 'objection':
      return 'arrow-objection';
    case 'option':
      return 'arrow-primary';
    case 'statement':
      return 'arrow-dark-gray';
    default:
      return 'arrow-support';
  }
};
