import React from 'react';
import { useViewport } from '@xyflow/react';

interface CursorData {
  fx?: number;
  fy?: number;
  name: string;
  color: string;
}

interface CursorOverlayProps {
  cursors: Map<number, CursorData>;
}

export const CursorOverlay: React.FC<CursorOverlayProps> = ({ cursors }) => {
  const { x: vx, y: vy, zoom } = useViewport();
  const dx = 2;
  const dy = 0;

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {Array.from(cursors.entries()).map(([clientId, cursor]) => {
        const left = (cursor.fx ?? 0) * zoom + vx + dx;
        const top = (cursor.fy ?? 0) * zoom + vy + dy;
        return (
          <div
            key={clientId}
            className="absolute"
            style={{ left, top }}
          >
            <svg
              width="16"
              height="24"
              viewBox="0 0 16 24"
              className="drop-shadow"
              style={{ filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.4))' }}
            >
              <path
                d="M1 1 L1 18 L5 14 L8 22 L12 21 L9 13 L15 13 Z"
                fill={cursor.color || '#3b82f6'}
                stroke="white"
                strokeWidth="1"
              />
            </svg>
            <div
              className="ml-1 px-1.5 py-0.5 text-[10px] rounded text-white inline-block align-middle"
              style={{ backgroundColor: cursor.color || '#3b82f6' }}
            >
              {cursor.name}
            </div>
          </div>
        );
      })}
    </div>
  );
};