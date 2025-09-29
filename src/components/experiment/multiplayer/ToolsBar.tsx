'use client';

import React from 'react';
import { Pointer as PointerIcon, Link as LinkIcon, Hand as HandIcon, Undo2, Redo2, HelpCircle } from 'lucide-react';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ToolbarButton } from "./ToolbarButton";

interface ToolsBarProps {
  connectMode: boolean;
  setConnectMode: React.Dispatch<React.SetStateAction<boolean>>;
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
            {connectAnchorId ? 'Click a target node or edge to connect' : 'Click a starting node or edge to connect from'}
          </span>
          <div className="h-5 w-px bg-stone-200 mx-2" />
          <button
            onClick={() => setConnectAnchorId(null)}
            className="text-sm rounded-full px-3 py-1 bg-stone-100 text-stone-900 hover:bg-stone-200"
          >
            Restart
          </button>
          <button
            onClick={() => { setConnectMode(false); setConnectAnchorId(null); }}
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
            onClick={() => { setConnectMode(false); setConnectAnchorId(null); setGrabMode?.(false); }}
          >
            <PointerIcon className="h-5 w-5" />
          </ToolbarButton>

          {/* Connect (line) */}
          <ToolbarButton
            label={readOnly ? "Read-only" : "Connect"}
            shortcut={readOnly ? undefined : "L"}
            disabled={!!readOnly}
            active={!!connectMode}
            onClick={() => { if (!readOnly) { setGrabMode?.(false); setConnectMode(true); setConnectAnchorId(null); } }}
          >
            <LinkIcon className="h-5 w-5" />
          </ToolbarButton>

          {/* Hand (grab/pan) */}
          <ToolbarButton
            label="Hand"
            shortcut="H"
            active={!!grabMode}
            onClick={() => { setConnectMode(false); setConnectAnchorId(null); setGrabMode?.(!grabMode); }}
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

          <div className="h-6 w-px bg-stone-200 mx-2" />

          {/* Help */}
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <div className="h-10 w-10 inline-flex items-center justify-center rounded-full text-blue-400 hover:text-blue-600 cursor-help transition-colors">
                <HelpCircle className="h-5 w-5" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-sm">
              <div className="space-y-3">
                <div className="font-semibold text-sm">Keyboard Shortcuts</div>

                <div className="space-y-2">
                  <div className="text-xs font-medium text-stone-600">Tools</div>
                  <div className="grid grid-cols-1 gap-1 text-xs">
                    <div className="flex justify-between">
                      <span>Select mode</span>
                      <span className="font-mono bg-stone-100 px-1 rounded">V</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Connect mode</span>
                      <span className="font-mono bg-stone-100 px-1 rounded">L</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Hand/Pan mode</span>
                      <span className="font-mono bg-stone-100 px-1 rounded">H</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Exit connect mode</span>
                      <span className="font-mono bg-stone-100 px-1 rounded">Esc</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-medium text-stone-600">Editing</div>
                  <div className="grid grid-cols-1 gap-1 text-xs">
                    <div className="flex justify-between">
                      <span>Delete selected</span>
                      <span className="font-mono bg-stone-100 px-1 rounded">Del / ⌫</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Undo</span>
                      <span className="font-mono bg-stone-100 px-1 rounded">⌘Z / Ctrl+Z</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Redo</span>
                      <span className="font-mono bg-stone-100 px-1 rounded">⇧⌘Z / Ctrl+Y</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-medium text-stone-600">Node Editing</div>
                  <div className="grid grid-cols-1 gap-1 text-xs">
                    <div className="flex justify-between">
                      <span>Finish editing</span>
                      <span className="font-mono bg-stone-100 px-1 rounded">Enter</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cancel editing</span>
                      <span className="font-mono bg-stone-100 px-1 rounded">Esc</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Undo in editor</span>
                      <span className="font-mono bg-stone-100 px-1 rounded">⌘Z / Ctrl+Z</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Redo in editor</span>
                      <span className="font-mono bg-stone-100 px-1 rounded">⇧⌘Z / Ctrl+Y</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-medium text-stone-600">Canvas Navigation</div>
                  <div className="grid grid-cols-1 gap-1 text-xs">
                    <div className="flex justify-between">
                      <span>Pan canvas</span>
                      <span className="font-mono bg-stone-100 px-1 rounded">Middle Click + Drag</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pan canvas (H mode)</span>
                      <span className="font-mono bg-stone-100 px-1 rounded">Left Click + Drag</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pan with scroll</span>
                      <span className="font-mono bg-stone-100 px-1 rounded">Scroll Wheel</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-medium text-stone-600">Node Interaction</div>
                  <div className="grid grid-cols-1 gap-1 text-xs">
                    <div className="flex justify-between">
                      <span>Create node</span>
                      <span className="font-mono bg-stone-100 px-1 rounded">Double-click</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Select node</span>
                      <span className="font-mono bg-stone-100 px-1 rounded">Click</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Multi-select nodes</span>
                      <span className="font-mono bg-stone-100 px-1 rounded">⇧ + Click</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Move node</span>
                      <span className="font-mono bg-stone-100 px-1 rounded">Click + Drag</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Edit node text</span>
                      <span className="font-mono bg-stone-100 px-1 rounded">Double-click</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Context menu</span>
                      <span className="font-mono bg-stone-100 px-1 rounded">Right-click</span>
                    </div>
                  </div>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
};
