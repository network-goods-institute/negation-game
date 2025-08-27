import React from 'react';
import { Pointer as PointerIcon, Link as LinkIcon, Hand as HandIcon, Undo2, Redo2 } from 'lucide-react';

interface ToolsBarProps {
  connectMode: boolean;
  setConnectMode: (f: (v: boolean) => boolean | boolean) => void;
  setConnectAnchorId: (id: string | null) => void;
  canUndo: boolean;
  canRedo: boolean;
  undo?: () => void;
  redo?: () => void;
  connectAnchorId: string | null;
  readOnly?: boolean;
  grabMode?: boolean;
  setGrabMode?: (v: boolean) => void;
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
  readOnly,
  grabMode,
  setGrabMode,
}) => {
  // Focused (connect) mode UI
  if (connectMode) {
    return (
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-white/90 backdrop-blur border-2 border-blue-200 shadow-xl rounded-full px-4 py-2 flex items-center gap-3 transition-all">
          <div className="flex items-center gap-2 px-1 text-blue-700">
            <LinkIcon className="h-5 w-5" />
            <span className="text-sm font-medium">Connecting</span>
          </div>
          <span className="text-sm text-stone-700">
            {connectAnchorId ? 'Now click a child' : 'Click a parent node'}
          </span>
          <div className="h-5 w-px bg-stone-200 mx-2" />
          <button
            onClick={() => setConnectAnchorId(null)}
            className="text-sm rounded-full px-3 py-1 bg-stone-100 text-stone-900 hover:bg-stone-200"
          >
            Reset
          </button>
          <button
            onClick={() => { setConnectMode(false as any); setConnectAnchorId(null); }}
            className="text-sm rounded-full px-3 py-1 bg-blue-600 text-white hover:bg-blue-700"
          >
            Done (Esc)
          </button>
        </div>
      </div>
    );
  }

  // Default toolbar (idle)
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
      <div className="bg-white/90 backdrop-blur border-2 border-blue-200 shadow-xl rounded-full px-4 py-2 flex items-center gap-2 transition-all">
        {/* Pointer */}
        <button
          onClick={() => { setConnectMode(false as any); setConnectAnchorId(null); setGrabMode?.(false); }}
          title="Pointer"
          className={`h-10 w-10 inline-flex items-center justify-center rounded-full border ${!connectMode && !grabMode ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'}`}
        >
          <PointerIcon className="h-5 w-5" />
        </button>
        {/* Connect (line) */}
        <button
          onClick={() => { if (!readOnly) { setGrabMode?.(false); setConnectMode(true as any); setConnectAnchorId(null); } }}
          disabled={!!readOnly}
          title={readOnly ? 'Read-only' : 'Connect (L)'}
          className={`h-10 w-10 inline-flex items-center justify-center rounded-full border ${connectMode ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'} ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <LinkIcon className="h-5 w-5" />
        </button>
        {/* Grab (hand) */}
        <button
          onClick={() => { setConnectMode(false as any); setConnectAnchorId(null); setGrabMode?.(!grabMode); }}
          title="Grab (pan)"
          className={`h-10 w-10 inline-flex items-center justify-center rounded-full border ${grabMode ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'}`}
        >
          <HandIcon className="h-5 w-5" />
        </button>
        <div className="h-6 w-px bg-stone-200 mx-2" />
        {/* Undo */}
        <button
          onClick={() => undo?.()}
          disabled={!canUndo}
          title="Undo"
          className={`h-10 w-10 inline-flex items-center justify-center rounded-full border bg-white text-blue-700 border-blue-200 hover:bg-blue-50 ${!canUndo ? 'opacity-50 cursor-not-allowed hover:bg-white' : ''}`}
        >
          <Undo2 className="h-5 w-5" />
        </button>
        {/* Redo */}
        <button
          onClick={() => redo?.()}
          disabled={!canRedo}
          title="Redo"
          className={`h-10 w-10 inline-flex items-center justify-center rounded-full border bg-white text-blue-700 border-blue-200 hover:bg-blue-50 ${!canRedo ? 'opacity-50 cursor-not-allowed hover:bg-white' : ''}`}
        >
          <Redo2 className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
