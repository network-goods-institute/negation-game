import React from 'react';
import { Handle, Position } from '@xyflow/react';

interface PointNodeProps {
  data: {
    content: string;
    editedBy?: string;
  };
  id: string;
}

export const PointNode: React.FC<PointNodeProps> = ({ data, id }) => {
  return (
    <>
      <Handle
        id={`${id}-source-handle`}
        type="source"
        position={Position.Top}
        className="opacity-0 pointer-events-none"
      />
      <Handle
        id={`${id}-incoming-handle`}
        type="target"
        position={Position.Bottom}
        className="opacity-0 pointer-events-none"
      />
      <div className="px-4 py-3 shadow-lg rounded-lg bg-white border-2 border-stone-200 min-w-[200px] max-w-[300px] relative">
        <div className="text-sm text-gray-900 leading-relaxed">
          {data.content}
        </div>
        {data.editedBy && (
          <div className="absolute -top-6 left-0 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
            {data.editedBy}
          </div>
        )}
      </div>
    </>
  );
};