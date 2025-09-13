import React from 'react';

export interface EdgeMidpointControlProps {
  cx: number;
  cy: number;
  borderColor: string;
  onContextMenu: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  title?: string;
}

export const EdgeMidpointControl: React.FC<EdgeMidpointControlProps> = ({
  cx,
  cy,
  borderColor,
  onContextMenu,
  children,
  title = "Edge controls"
}) => {
  return (
    <foreignObject
      x={cx - 8}
      y={cy - 8}
      width={16}
      height={16}
      style={{ pointerEvents: 'all' }}
    >
      <div
        onContextMenu={onContextMenu}
        title={title}
        className="w-4 h-4 rounded-full bg-white border flex items-center justify-center select-none"
        style={{
          borderColor,
          cursor: 'pointer',
          userSelect: 'none' as any
        }}
        draggable={false}
      >
        {children}
      </div>
    </foreignObject>
  );
};