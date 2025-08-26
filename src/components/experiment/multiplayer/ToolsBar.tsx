import React from 'react';

interface ToolsBarProps {
  connectMode: boolean;
  setConnectMode: (f: (v: boolean) => boolean | boolean) => void;
  setConnectAnchorId: (id: string | null) => void;
  canUndo: boolean;
  canRedo: boolean;
  undo?: () => void;
  redo?: () => void;
  connectAnchorId: string | null;
}

export const ToolsBar: React.FC<ToolsBarProps> = ({
  connectMode,
  setConnectMode,
  setConnectAnchorId,
  canUndo,
  canRedo,
  undo,
  redo,
  connectAnchorId,
}) => {
  // Default toolbar (idle) vs. focused (connect) mode UI
  if (connectMode) {
    return (
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-white/95 backdrop-blur border shadow-xl rounded-full px-3 py-1.5 flex items-center gap-2 transition-all">
          <div className="flex items-center gap-2 px-1">
            <span className="inline-flex h-2 w-2 rounded-full bg-blue-600" />
            <span className="text-xs font-medium text-stone-800">Connecting</span>
          </div>
          <span className="text-xs text-stone-600">
            {connectAnchorId ? 'Now click a child' : 'Click a parent node'}
          </span>
          <div className="h-4 w-px bg-stone-200 mx-1" />
          <button
            onClick={() => setConnectAnchorId(null)}
            className="text-xs rounded-full px-2 py-1 bg-stone-200 text-stone-800 hover:bg-stone-300"
          >
            Reset
          </button>
          <button
            onClick={() => { setConnectMode(false as any); setConnectAnchorId(null); }}
            className="text-xs rounded-full px-2 py-1 bg-red-600 text-white hover:bg-red-700"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
      <div className="bg-white/95 backdrop-blur border shadow-xl rounded-full px-3 py-1.5 flex items-center gap-2 transition-all">
        <button
          onClick={() => { setConnectMode((v) => !v as any); setConnectAnchorId(null); }}
          className="text-xs rounded-full px-3 py-1 bg-stone-800 text-white hover:bg-stone-900"
        >
          Connect
        </button>
        <div className="h-4 w-px bg-stone-200" />
        <button
          onClick={() => undo?.()}
          disabled={!canUndo}
          className={`text-xs rounded-full px-2 py-1 bg-stone-200 text-stone-800 hover:bg-stone-300 ${!canUndo ? 'opacity-50 cursor-not-allowed hover:bg-stone-200' : ''}`}
        >
          Undo
        </button>
        <button
          onClick={() => redo?.()}
          disabled={!canRedo}
          className={`text-xs rounded-full px-2 py-1 bg-stone-200 text-stone-800 hover:bg-stone-300 ${!canRedo ? 'opacity-50 cursor-not-allowed hover:bg-stone-200' : ''}`}
        >
          Redo
        </button>
      </div>
    </div>
  );
};
