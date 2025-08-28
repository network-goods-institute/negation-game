import React from 'react';
import { Pointer as PointerIcon, Link as LinkIcon, Hand as HandIcon, Undo2, Redo2, Sparkles } from 'lucide-react';
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToolbarButton } from "./ToolbarButton";

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
  importanceSim?: boolean;
  setImportanceSim?: (v: boolean) => void;
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
  importanceSim,
  setImportanceSim,
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
            {connectAnchorId ? 'Drag to a child node' : 'Hold-drag from a parent node'}
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
      <TooltipProvider>
        <div className="bg-white/90 backdrop-blur border-2 border-blue-200 shadow-xl rounded-full px-4 py-2 flex items-center gap-2 transition-all">
          {/* Select (pointer) */}
          <ToolbarButton
            label="Select"
            shortcut="V"
            active={!connectMode && !grabMode}
            onClick={() => { setConnectMode(false as any); setConnectAnchorId(null); setGrabMode?.(false); }}
          >
            <PointerIcon className="h-5 w-5" />
          </ToolbarButton>

          {/* Connect (line) */}
          <ToolbarButton
            label={readOnly ? "Read-only" : "Connect"}
            shortcut={readOnly ? undefined : "L"}
            disabled={!!readOnly}
            active={!!connectMode}
            onClick={() => { if (!readOnly) { setGrabMode?.(false); setConnectMode(true as any); setConnectAnchorId(null); } }}
          >
            <LinkIcon className="h-5 w-5" />
          </ToolbarButton>

          {/* Hand (grab/pan) */}
          <ToolbarButton
            label="Hand"
            shortcut="H"
            active={!!grabMode}
            onClick={() => { setConnectMode(false as any); setConnectAnchorId(null); setGrabMode?.(!grabMode); }}
          >
            <HandIcon className="h-5 w-5" />
          </ToolbarButton>

          <div className="h-6 w-px bg-stone-200 mx-2" />

          {/* Undo */}
          <ToolbarButton
            label="Undo"
            shortcut="⌘Z / Ctrl+Z"
            disabled={!canUndo}
            onClick={() => undo?.()}
            className="!bg-white !text-blue-700 !border-blue-200 hover:!bg-blue-50"
          >
            <Undo2 className="h-5 w-5" />
          </ToolbarButton>

          {/* Redo */}
          <ToolbarButton
            label="Redo"
            shortcut="⇧⌘Z / Ctrl+Y"
            disabled={!canRedo}
            onClick={() => redo?.()}
            className="!bg-white !text-blue-700 !border-blue-200 hover:!bg-blue-50"
          >
            <Redo2 className="h-5 w-5" />
          </ToolbarButton>

          {/* Simulation toggle */}
          <ToolbarButton
            label={"Simulation (rough preview of importance UI — shared across participants)"}
            active={!!importanceSim}
            onClick={() => setImportanceSim?.(!importanceSim)}
            className={importanceSim ? undefined : '!bg-white !text-blue-700 !border-blue-200 hover:!bg-blue-50'}
            title="Toggle importance simulation (shared)"
          >
            <Sparkles className="h-5 w-5" />
          </ToolbarButton>
        </div>
      </TooltipProvider>
    </div>
  );
};
