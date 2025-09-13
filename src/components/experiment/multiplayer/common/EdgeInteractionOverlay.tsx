import React from 'react';

export interface EdgeInteractionOverlayProps {
  shouldRender: boolean;
  pathD?: string;
  sourceX?: number;
  sourceY?: number;
  targetX?: number;
  targetY?: number;
  connectMode: boolean;
  onEdgeClick: (e: React.MouseEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export const EdgeInteractionOverlay: React.FC<EdgeInteractionOverlayProps> = ({
  shouldRender,
  pathD,
  sourceX,
  sourceY,
  targetX,
  targetY,
  connectMode,
  onEdgeClick,
  onMouseDown,
  onMouseUp,
  onContextMenu,
}) => {
  if (!shouldRender) return null;

  const overlayStyle = { pointerEvents: 'stroke' as const };

  if (pathD) {
    // Curved edge overlay
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
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onContextMenu={onContextMenu}
      />
    );
  } else if (
    Number.isFinite(sourceX) &&
    Number.isFinite(sourceY) &&
    Number.isFinite(targetX) &&
    Number.isFinite(targetY)
  ) {
    // Straight edge overlay
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
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onContextMenu={onContextMenu}
      />
    );
  }

  return null;
};