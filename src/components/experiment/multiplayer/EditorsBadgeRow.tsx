import React from 'react';

export interface EditorInfo { name: string; color: string }

interface EditorsBadgeRowProps {
  editors: EditorInfo[];
}

export const EditorsBadgeRow: React.FC<EditorsBadgeRowProps> = ({ editors }) => {
  if (!editors || editors.length === 0) return null;
  return (
    <div className="absolute -top-6 left-0 flex gap-1 flex-wrap">
      {editors.map((ed, idx) => (
        <div key={`${ed.name}-${idx}`} className="text-xs px-2 py-1 rounded text-white" style={{ backgroundColor: ed.color }}>
          {ed.name}
        </div>
      ))}
    </div>
  );
};

