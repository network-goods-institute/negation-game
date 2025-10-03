import React from 'react';

export interface EdgeMidpointControlProps {
  cx: number;
  cy: number;
  borderColor: string;
  onContextMenu?: (e: React.MouseEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  children: React.ReactNode;
  title?: string;
  disabled?: boolean;
}

export const EdgeMidpointControl: React.FC<EdgeMidpointControlProps> = ({
  cx,
  cy,
  borderColor,
  onContextMenu,
  onClick,
  onPointerDown,
  children,
  title = "Edge controls",
  disabled = false
}) => {

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    onClick?.(e);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    onPointerDown?.(e);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(e);
  };

  return (
    <foreignObject
      x={cx - 8}
      y={cy - 8}
      width={16}
      height={16}
      style={{ pointerEvents: disabled ? 'none' : 'all' }}
    >
      <div
        onContextMenu={handleContextMenu}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        title={title}
        className="w-4 h-4 rounded-full bg-white border flex items-center justify-center select-none"
        style={{
          borderColor,
          cursor: disabled ? 'default' : 'pointer',
          userSelect: 'none' as any
        }}
        draggable={false}
      >
        {children}
      </div>
    </foreignObject>
  );
};