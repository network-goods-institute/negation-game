'use client';

import React, { useState, useEffect } from 'react';
import { ReactFlow, ReactFlowProvider, Node, Edge, Background, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { edgeTypes } from '../../componentRegistry';
import { TutorialGraphProvider } from '../TutorialGraphProvider';
import { tutorialNodeTypes } from '../TutorialPointNode';

export function EditingPointAnimation() {
  // Phases: 0=cursor moves, 1=pill shows, 2=first click, 3=second click, 4=typing
  const [phase, setPhase] = useState(0);
  const [typingPos, setTypingPos] = useState(0);
  const [cursorX, setCursorX] = useState(50);
  const [cursorY, setCursorY] = useState(30);
  const [showCursor, setShowCursor] = useState(true);

  const targetText = "Remote workers report 25% fewer daily interruptions";

  const [nodes, setNodes] = useNodesState<Node>([
    { id: 'root', type: 'tutorialPoint', position: { x: 300, y: 50 }, data: { label: 'Remote work increases productivity by 25%' } },
    { id: 'target', type: 'tutorialPoint', position: { x: 150, y: 200 }, data: { label: 'Remote work is good' } },
    { id: 'sibling', type: 'tutorialPoint', position: { x: 450, y: 200 }, data: { label: 'Remote work eliminates 2 hours of daily commute' } },
    { id: 'child', type: 'tutorialPoint', position: { x: 150, y: 350 }, data: { label: 'Home offices have more distractions than offices' } },
  ]);

  const [edges] = useEdgesState<Edge>([
    { id: 'e1', source: 'root', target: 'target', type: 'support' },
    { id: 'e2', source: 'root', target: 'sibling', type: 'support' },
    { id: 'e3', source: 'target', target: 'child', type: 'negation' },
  ]);

  // Update target node based on phase
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === 'target') {
          return {
            ...node,
            data: {
              label: phase >= 5 ? targetText : 'Remote work is good',
              isEditing: phase >= 5,
              cursorPos: typingPos,
              showPill: phase === 1,
            }
          };
        }
        return node;
      })
    );
  }, [phase, typingPos, targetText, setNodes]);

  // Main animation sequence
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (phase === 0) {
      // Cursor moves to target node (1.5s)
      timer = setTimeout(() => setPhase(1), 1500);
    } else if (phase === 1) {
      // Pill shows (1s)
      timer = setTimeout(() => setPhase(2), 1000);
    } else if (phase === 2) {
      // First click of double-click (200ms)
      timer = setTimeout(() => setPhase(3), 200);
    } else if (phase === 3) {
      // Pause between clicks (200ms)
      timer = setTimeout(() => setPhase(4), 200);
    } else if (phase === 4) {
      // Second click of double-click (200ms)
      timer = setTimeout(() => {
        setShowCursor(false);
        setPhase(5);
      }, 200);
    } else if (phase === 5) {
      // After typing completes, reset
      if (typingPos >= targetText.length) {
        timer = setTimeout(() => {
          setPhase(0);
          setTypingPos(0);
          setCursorX(50);
          setCursorY(30);
          setShowCursor(true);
        }, 2000);
      }
    }

    return () => clearTimeout(timer);
  }, [phase, typingPos, targetText.length]);

  // Cursor movement to target node
  useEffect(() => {
    if (phase === 0) {
      // Target node screen position (accounting for viewport transform)
      // viewport: x: 100, y: 0, zoom: 0.5
      // target node flow position: x: 150, y: 200
      // node approximate size: 200w x 50h
      // center of node in flow: x: 150 + 100, y: 200 + 25 = (250, 225)
      const nodeCenterFlowX = 150 + 100; // node x + half width
      const nodeCenterFlowY = 200 + 25;  // node y + half height
      const targetX = 100 + nodeCenterFlowX * 0.5; // viewport offset + scaled position
      const targetY = 0 + nodeCenterFlowY * 0.5;
      const step = () => {
        setCursorX(x => x + (targetX - x) * 0.12);
        setCursorY(y => y + (targetY - y) * 0.12);
      };
      const interval = setInterval(step, 16);
      return () => clearInterval(interval);
    }
  }, [phase]);

  // Typing animation
  useEffect(() => {
    if (phase === 5 && typingPos < targetText.length) {
      const timer = setTimeout(() => {
        setTypingPos(typingPos + 1);
      }, 70);
      return () => clearTimeout(timer);
    }
  }, [phase, typingPos, targetText.length]);

  return (
    <div className="relative w-full h-64">
      <ReactFlowProvider>
        <TutorialGraphProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={tutorialNodeTypes}
            edgeTypes={edgeTypes}
            defaultViewport={{ x: 100, y: 0, zoom: 0.5 }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            proOptions={{ hideAttribution: true }}
            minZoom={0.5}
            maxZoom={0.5}
          >
            <Background />
          </ReactFlow>
        </TutorialGraphProvider>
      </ReactFlowProvider>

      {/* Animated cursor */}
      {showCursor && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${cursorX}px`,
            top: `${cursorY}px`,
            zIndex: 2000,
          }}
        >
          {/* Click ripple effect - shows on first click (phase 2) and second click (phase 4) */}
          {(phase === 2 || phase === 4) && (
            <div className="absolute -left-3 -top-3 w-12 h-12" key={phase}>
              <div className="absolute inset-0 rounded-full bg-blue-400/40 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-blue-500/30 animate-ping" style={{ animationDelay: '75ms' }} />
            </div>
          )}

          <svg width="24" height="24" viewBox="0 0 24 24" className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] relative z-10">
            <g className={phase === 2 || phase === 4 ? 'animate-click-down' : ''}>
              {/* Outer white border */}
              <path
                d="M 5.5 3 L 5.5 17.5 L 9.8 13.2 L 12.5 20 L 15 19 L 12.3 12.2 L 17.5 12.2 Z"
                fill="white"
                stroke="none"
              />
              {/* Inner black cursor */}
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
