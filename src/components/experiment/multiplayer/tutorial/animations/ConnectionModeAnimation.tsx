'use client';

import React, { useState, useEffect } from 'react';
import { ReactFlow, ReactFlowProvider, Node, Edge, Background, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { edgeTypes } from '../../componentRegistry';
import { TutorialGraphProvider } from '../TutorialGraphProvider';
import { tutorialNodeTypes } from '../TutorialPointNode';
import { Pointer as PointerIcon, Link as LinkIcon, Hand as HandIcon, Undo2, Redo2 } from 'lucide-react';

export function ConnectionModeAnimation() {
  const [phase, setPhase] = useState(0);
  const [cursorX, setCursorX] = useState(50);
  const [cursorY, setCursorY] = useState(30);
  const [showCursor, setShowCursor] = useState(true);
  const [connectionMode, setConnectionMode] = useState(false);
  const [connectAnchorId, setConnectAnchorId] = useState<string | null>(null);
  const [previewLine, setPreviewLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  const [nodes] = useNodesState<Node>([
    {
      id: '1',
      type: 'tutorialPoint',
      position: { x: 100, y: 100 },
      data: { label: 'Regular exercise improves mental health' },
    },
    {
      id: '2',
      type: 'tutorialPoint',
      position: { x: 100, y: 280 },
      data: { label: '30 min of exercise releases mood-boosting endorphins' },
    },
  ]);
  const [edges, setEdges] = useEdgesState<Edge>([]);

  // Main animation sequence
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (phase === 0) {
      // Cursor moves to Connect button
      timer = setTimeout(() => setPhase(1), 1200);
    } else if (phase === 1) {
      // Click Connect button
      setConnectionMode(true);
      timer = setTimeout(() => setPhase(2), 300);
    } else if (phase === 2) {
      // Cursor moves to Point A
      timer = setTimeout(() => setPhase(3), 1000);
    } else if (phase === 3) {
      // Click Point A
      setConnectAnchorId('1');
      timer = setTimeout(() => setPhase(4), 300);
    } else if (phase === 4) {
      // Cursor moves to Point B, show preview line
      timer = setTimeout(() => setPhase(5), 1200);
    } else if (phase === 5) {
      // Click Point B, complete connection
      timer = setTimeout(() => {
        setEdges([{
          id: 'e1-2',
          source: '1',
          target: '2',
          type: 'support',
        }]);
        setConnectAnchorId(null); // Reset anchor after completing connection
        setConnectionMode(false); // Exit connect mode after completing connection
        setPreviewLine(null);
        setPhase(6);
      }, 300);
    } else if (phase === 6) {
      // Hold completed state - connection mode stays active
      timer = setTimeout(() => {
        // Reset
        setPhase(0);
        setEdges([]);
        setCursorX(50);
        setCursorY(30);
        setConnectionMode(false);
        setConnectAnchorId(null);
        setPreviewLine(null);
      }, 2000);
    }

    return () => clearTimeout(timer);
  }, [phase, setEdges]);

  // Cursor movement
  useEffect(() => {
    if (phase === 0) {
      // Move to Connect button in toolbar (second button from left)
      // Toolbar is centered and scaled to 0.6
      // Container width ~600px, centered = 300px
      // Toolbar width before scale ≈ 288px, after scale ≈ 173px
      // Toolbar left edge: 300 - 86.5 ≈ 213.5px
      // Connect button offset from left: (16 + 40 + 8 + 20) * 0.6 = 50.4px
      // Connect button position: 213.5 + 50.4 ≈ 264px
      const targetX = 264;
      const targetY = 224; // Bottom toolbar position
      const step = () => {
        setCursorX(x => x + (targetX - x) * 0.12);
        setCursorY(y => y + (targetY - y) * 0.12);
      };
      const interval = setInterval(step, 16);
      return () => clearInterval(interval);
    } else if (phase === 2) {
      // Move to Point A
      const nodeACenterFlowX = 100 + 100; // node x + half width
      const nodeACenterFlowY = 100 + 25; // node y + half height
      const targetX = 50 + nodeACenterFlowX * 0.6;
      const targetY = -20 + nodeACenterFlowY * 0.6;
      const step = () => {
        setCursorX(x => x + (targetX - x) * 0.12);
        setCursorY(y => y + (targetY - y) * 0.12);
      };
      const interval = setInterval(step, 16);
      return () => clearInterval(interval);
    } else if (phase === 4) {
      // Move to Point B
      const nodeBCenterFlowX = 100 + 100;
      const nodeBCenterFlowY = 280 + 25;
      const targetX = 50 + nodeBCenterFlowX * 0.6;
      const targetY = -20 + nodeBCenterFlowY * 0.6;
      const step = () => {
        setCursorX(x => x + (targetX - x) * 0.12);
        setCursorY(y => y + (targetY - y) * 0.12);
      };
      const interval = setInterval(step, 16);
      return () => clearInterval(interval);
    }
  }, [phase]);

  // Preview line during cursor movement to Point B
  useEffect(() => {
    if (phase === 4) {
      // Point A center in screen coordinates
      const nodeACenterFlowX = 100 + 100;
      const nodeACenterFlowY = 100 + 25;
      const x1 = 50 + nodeACenterFlowX * 0.6;
      const y1 = -20 + nodeACenterFlowY * 0.6;

      setPreviewLine({ x1, y1, x2: cursorX, y2: cursorY });
    } else {
      setPreviewLine(null);
    }
  }, [phase, cursorX, cursorY]);

  return (
    <div className="relative w-full h-64">
      <ReactFlowProvider>
        <TutorialGraphProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={tutorialNodeTypes}
            edgeTypes={edgeTypes}
            defaultViewport={{ x: 50, y: -20, zoom: 0.6 }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            proOptions={{ hideAttribution: true }}
            minZoom={0.6}
            maxZoom={0.6}
          >
            <Background />
          </ReactFlow>
        </TutorialGraphProvider>
      </ReactFlowProvider>

      {/* Preview line */}
      {previewLine && (
        <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 1000 }}>
          <defs>
            <marker
              id="tutorial-preview-arrow"
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--sync-primary))" />
            </marker>
          </defs>
          <line
            x1={previewLine.x1}
            y1={previewLine.y1}
            x2={previewLine.x2}
            y2={previewLine.y2}
            stroke="hsl(var(--sync-primary))"
            strokeWidth="2.5"
            strokeOpacity="0.95"
            markerEnd="url(#tutorial-preview-arrow)"
          />
        </svg>
      )}

      {/* Tutorial toolbar - mock version that stays in the animation container */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[900] scale-[0.6] origin-bottom">
        {connectionMode ? (
          // Connection mode toolbar
          <div className="bg-white/90 backdrop-blur border-2 border-blue-200 shadow-xl rounded-full px-6 py-2 min-w-[620px] flex items-center gap-3 transition-all">
            <div className="flex items-center gap-2 px-1 text-blue-700">
              <LinkIcon className="h-5 w-5" />
              <span className="text-[13px] font-medium leading-none">Connecting</span>
            </div>
            <span className="text-[13px] text-stone-700 leading-none whitespace-nowrap">
              {connectAnchorId
                ? 'Click target point or connecting line for mitigation'
                : 'Click on a point or a connecting line to start connection'}
            </span>
            <div className="h-5 w-px bg-stone-200 mx-2" />
            <button className="text-[13px] rounded-full px-3 py-1 bg-stone-100 text-stone-900 hover:bg-stone-200">
              Restart
            </button>
            <button className="text-[13px] rounded-full px-3 py-1 bg-blue-600 text-white hover:bg-blue-700">
              Done (Esc)
            </button>
          </div>
        ) : (
          // Default toolbar
          <div className="bg-white/90 backdrop-blur border-2 border-blue-200 shadow-xl rounded-full px-4 py-2 flex items-center gap-2 transition-all">
            {/* Select button */}
            <button className="h-10 w-10 inline-flex items-center justify-center rounded-full border bg-blue-600 text-white border-blue-600">
              <PointerIcon className="h-5 w-5" />
            </button>

            {/* Connect button */}
            <button className="h-10 w-10 inline-flex items-center justify-center rounded-full border bg-white text-blue-700 border-blue-200 hover:bg-blue-50">
              <LinkIcon className="h-5 w-5" />
            </button>

            {/* Hand button */}
            <button className="h-10 w-10 inline-flex items-center justify-center rounded-full border bg-white text-blue-700 border-blue-200 hover:bg-blue-50">
              <HandIcon className="h-5 w-5" />
            </button>

            <div className="h-6 w-px bg-stone-200 mx-2" />

            {/* Undo */}
            <button className="h-10 w-10 inline-flex items-center justify-center rounded-full border bg-white text-blue-700 border-blue-200 opacity-50 cursor-not-allowed hover:bg-white">
              <Undo2 className="h-5 w-5" />
            </button>

            {/* Redo */}
            <button className="h-10 w-10 inline-flex items-center justify-center rounded-full border bg-white text-blue-700 border-blue-200 opacity-50 cursor-not-allowed hover:bg-white">
              <Redo2 className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Cursor */}
      {showCursor && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${cursorX}px`,
            top: `${cursorY}px`,
            zIndex: 2001,
          }}
        >
          {/* Click ripple effect */}
          {(phase === 1 || phase === 3 || phase === 5) && (
            <div className="absolute -left-3 -top-3 w-12 h-12" key={phase}>
              <div className="absolute inset-0 rounded-full bg-blue-400/40 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-blue-500/30 animate-ping" style={{ animationDelay: '75ms' }} />
            </div>
          )}

          <svg width="24" height="24" viewBox="0 0 24 24" className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] relative z-10">
            <g className={(phase === 1 || phase === 3 || phase === 5) ? 'animate-click-down' : ''}>
              <path
                d="M 5.5 3 L 5.5 17.5 L 9.8 13.2 L 12.5 20 L 15 19 L 12.3 12.2 L 17.5 12.2 Z"
                fill="white"
                stroke="none"
              />
              <path
                d="M 7 5.5 L 7 15.3 L 10.2 12.1 L 12.3 17.5 L 13.7 16.9 L 11.6 11.5 L 15.5 11.5 Z"
                fill="black"
                stroke="none"
              />
            </g>
          </svg>
        </div>
      )}

      <style jsx>{`
        @keyframes click-down {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(0.85); }
        }
        .animate-click-down {
          animation: click-down 0.15s ease-out;
        }
      `}</style>
    </div>
  );
}
