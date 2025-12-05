'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { Pointer as PointerIcon, Link as LinkIcon, Hand as HandIcon, Undo2, Redo2, HelpCircle } from 'lucide-react';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ToolbarButton } from "./ToolbarButton";
import { MarketModeControls } from "./MarketModeControls";
import { isMarketEnabled } from "@/utils/market/marketUtils";

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
  selectMode: boolean;
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
  selectMode,
}) => {
  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  const toolbarRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;

    const handleWheel = (event: WheelEvent) => {
      event.stopPropagation();
      event.preventDefault();
    };

    el.addEventListener('wheel', handleWheel, { passive: false, capture: true });

    return () => {
      el.removeEventListener('wheel', handleWheel, { capture: true } as any);
    };
  }, [connectMode]);


  // Focused (connect) mode UI
  if (connectMode) {
    const content = (
      <div ref={toolbarRef} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000]">
        <div className="bg-white/90 backdrop-blur border-2 border-blue-200 shadow-xl rounded-full px-4 py-2 flex items-center gap-3 transition-all">
          <div className="flex items-center gap-2 px-1 text-blue-700">
            <LinkIcon className="h-5 w-5" />
            <span className="text-sm font-medium">Connecting</span>
          </div>
          <span className="text-sm text-stone-700">
            {connectAnchorId
              ? 'Click target point or connecting line for mitigation'
              : 'Click on a point or a connecting line to start connection'}
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
    return portalTarget ? createPortal(content, portalTarget) : content;
  }

  // Default toolbar (idle)
  const content = (
    <div ref={toolbarRef} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000]">
      <TooltipProvider>
        <div className="bg-white/90 backdrop-blur border-2 border-blue-200 shadow-xl rounded-full px-4 py-2 flex items-center gap-2 transition-all">
          {/* Select (pointer) */}
          <ToolbarButton
            label="Select"
            shortcut="V"
            active={selectMode}
            onClick={() => { setConnectMode(false); setConnectAnchorId(null); setGrabMode?.(false); }}
          >
            <PointerIcon className="h-5 w-5" />
          </ToolbarButton>

          {/* Connect (line) */}
          <ToolbarButton
            label={readOnly ? "Read-only (Log in to make changes)" : "Connect"}
            shortcut={readOnly ? undefined : "A"}
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

          {isMarketEnabled() && (
            <>
              <div className="h-6 w-px bg-stone-200 mx-2" />

              {/* Market overlay mode controls (Auto / Text / Price) */}
              <MarketModeControls />
            </>
          )}

          <div className="h-6 w-px bg-stone-200 mx-2" />

          {/* Help */}
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <div className="h-10 w-10 inline-flex items-center justify-center rounded-full text-blue-400 hover:text-blue-600 cursor-help transition-colors">
                <HelpCircle className="h-5 w-5" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-3xl z-[1100]">
              <div className="space-y-3">
                <div className="font-semibold text-sm">Keyboard Shortcuts</div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-stone-600">Tools</div>
                    <div className="grid grid-cols-1 gap-1 text-xs">
                      <div className="flex justify-between gap-3">
                        <span>Select mode</span>
                        <span className="font-mono bg-stone-100 px-1 rounded">V</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>Connect mode</span>
                        <span className="font-mono bg-stone-100 px-1 rounded">A</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>Hand/Pan mode</span>
                        <span className="font-mono bg-stone-100 px-1 rounded">H</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>Exit connect mode</span>
                        <span className="font-mono bg-stone-100 px-1 rounded">Esc</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium text-stone-600">Editing</div>
                    <div className="grid grid-cols-1 gap-1 text-xs">
                      <div className="flex justify-between gap-3">
                        <span>Delete selected</span>
                        <span className="font-mono bg-stone-100 px-1 rounded">Del / ⌫</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>Undo</span>
                        <span className="font-mono bg-stone-100 px-1 rounded">⌘Z / Ctrl+Z</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>Redo</span>
                        <span className="font-mono bg-stone-100 px-1 rounded">⇧⌘Z / Ctrl+Y</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>Save</span>
                        <span className="font-mono bg-stone-100 px-1 rounded">⌘S / Ctrl+S</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium text-stone-600">Node Editing</div>
                    <div className="grid grid-cols-1 gap-1 text-xs">
                      <div className="flex justify-between gap-3">
                        <span>Finish editing</span>
                        <span className="font-mono bg-stone-100 px-1 rounded">Enter</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>Cancel editing</span>
                        <span className="font-mono bg-stone-100 px-1 rounded">Esc</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>Undo in editor</span>
                        <span className="font-mono bg-stone-100 px-1 rounded">⌘Z / Ctrl+Z</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>Redo in editor</span>
                        <span className="font-mono bg-stone-100 px-1 rounded">⇧⌘Z / Ctrl+Y</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium text-stone-600">Canvas Navigation</div>
                    <div className="grid grid-cols-1 gap-1 text-xs">
                      <div className="flex justify-between gap-3">
                        <span>Pan canvas</span>
                        <span className="font-mono bg-stone-100 px-1 rounded whitespace-nowrap">Middle Click + Drag</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>Pan canvas (H mode)</span>
                        <span className="font-mono bg-stone-100 px-1 rounded whitespace-nowrap">Left Click + Drag</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>Pan with scroll</span>
                        <span className="font-mono bg-stone-100 px-1 rounded">Scroll Wheel</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium text-stone-600">Node Interaction</div>
                    <div className="grid grid-cols-1 gap-1 text-xs">
                      <div className="flex justify-between gap-3">
                        <span>Create node</span>
                        <span className="font-mono bg-stone-100 px-1 rounded">Double-click</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>Select node</span>
                        <span className="font-mono bg-stone-100 px-1 rounded">Click</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>Multi-select nodes</span>
                        <span className="font-mono bg-stone-100 px-1 rounded">⇧ + Click</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>Box select (empty area)</span>
                        <span className="font-mono bg-stone-100 px-1 rounded whitespace-nowrap">Click + Drag</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>Move selected node(s)</span>
                        <span className="font-mono bg-stone-100 px-1 rounded whitespace-nowrap">Click + Drag</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>Edit node text</span>
                        <span className="font-mono bg-stone-100 px-1 rounded">Double-click</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>Context menu</span>
                        <span className="font-mono bg-stone-100 px-1 rounded">Right-click</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium text-stone-600">Node Duplication</div>
                    <div className="grid grid-cols-1 gap-1 text-xs">
                      <div className="flex justify-between gap-3">
                        <span>Copy node</span>
                        <span className="font-mono bg-stone-100 px-1 rounded">⌘C / Ctrl+C</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>Paste node</span>
                        <span className="font-mono bg-stone-100 px-1 rounded">⌘V / Ctrl+V</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>Duplicate while dragging</span>
                        <span className="font-mono bg-stone-100 px-1 rounded">Alt + Drag</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium text-stone-600">Advanced Navigation</div>
                    <div className="grid grid-cols-1 gap-1 text-xs">
                      <div className="flex justify-between gap-3">
                        <span>Pan canvas (Arrows)</span>
                        <span className="font-mono bg-stone-100 px-1 rounded">↑ ↓ ← →</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>Temporary hand mode</span>
                        <span className="font-mono bg-stone-100 px-1 rounded">Space (hold)</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium text-stone-600">Text Editing</div>
                    <div className="grid grid-cols-1 gap-1 text-xs">
                      <div className="flex justify-between gap-3">
                        <span>New line in node</span>
                        <span className="font-mono bg-stone-100 px-1 rounded">⇧ Enter</span>
                      </div>
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
  return portalTarget ? createPortal(content, portalTarget) : content;
};
