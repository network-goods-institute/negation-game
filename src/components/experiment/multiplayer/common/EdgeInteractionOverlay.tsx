import React from 'react';

export interface EdgeInteractionOverlayProps {
  shouldRender: boolean;
  pathD?: string;
  sourceX?: number;
  sourceY?: number;
  targetX?: number;
  targetY?: number;
  onEdgeClick: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
}

export const EdgeInteractionOverlay: React.FC<EdgeInteractionOverlayProps> = ({
  shouldRender,
  pathD,
  sourceX,
  sourceY,
  targetX,
  targetY,
  onEdgeClick,
  onContextMenu,
  onMouseEnter,
  onMouseLeave,
}) => {
  if (!shouldRender) return null;

  const overlayStyle = { pointerEvents: 'stroke' as const };

  if (pathD) {
    return (
      <path
        d={pathD}
        stroke="rgba(0,0,0,0)"
        strokeWidth={36}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        style={overlayStyle}
        onClick={onEdgeClick}
        onContextMenu={onContextMenu}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />
    );
  }

  if (
    Number.isFinite(sourceX) &&
    Number.isFinite(sourceY) &&
    Number.isFinite(targetX) &&
    Number.isFinite(targetY)
  ) {
    return (
      <line
        x1={sourceX}
        y1={sourceY}
        x2={targetX}
        y2={targetY}
        stroke="rgba(0,0,0,0)"
        strokeWidth={36}
        strokeLinecap="round"
        style={overlayStyle}
        onClick={onEdgeClick}
        onContextMenu={onContextMenu}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />
    );
  }

  return null;
}