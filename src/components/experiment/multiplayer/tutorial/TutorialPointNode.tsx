'use client';

import React from 'react';
import { Handle, Position } from '@xyflow/react';

interface TutorialPointNodeData {
  label: string;
  isEditing?: boolean;
  cursorPos?: number;
  showPill?: boolean;
}

export function TutorialPointNode({ data }: { data: TutorialPointNodeData }) {
  const displayText = data.isEditing && data.cursorPos !== undefined
    ? data.label.slice(0, data.cursorPos)
    : data.label;

  return (
    <div className="relative">
      {/* Handles for edge connections */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ opacity: 0 }}
      />

      <div className="bg-white text-gray-900 border-2 border-stone-200 px-4 py-3 rounded-lg min-w-[180px] max-w-[280px] shadow-sm">
        {data.isEditing ? (
          <div className="text-sm font-medium leading-snug text-left">
            <span className="text-stone-700">{displayText}</span>
            <span className="animate-pulse text-blue-600">|</span>
          </div>
        ) : (
          <div className="text-sm font-medium leading-snug text-left text-stone-700">
            {data.label}
          </div>
        )}
      </div>

      {/* Add Point pill */}
      {data.showPill && (
        <div className={`absolute left-1/2 -translate-x-1/2 bottom-[-56px] flex h-[72px] w-[200px] items-end justify-center transition-all duration-300 ease-out ${data.showPill ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}`}>
          <button
            type="button"
            className="bg-stone-900 rounded-full min-h-8 min-w-8 px-3 py-1 text-[11px] md:text-[12px] whitespace-nowrap font-medium text-white shadow-sm"
          >
            Add Point
          </button>
        </div>
      )}
    </div>
  );
}

export const tutorialNodeTypes = {
  tutorialPoint: TutorialPointNode,
};
