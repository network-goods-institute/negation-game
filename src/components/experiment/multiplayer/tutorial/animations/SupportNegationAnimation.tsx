'use client';

import React, { useState, useEffect } from 'react';
import { ReactFlow, ReactFlowProvider, Node, Edge, Background, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { edgeTypes } from '../../componentRegistry';
import { TutorialGraphProvider } from '../TutorialGraphProvider';
import { tutorialNodeTypes } from '../TutorialPointNode';

export function SupportNegationAnimation() {
  const [phase, setPhase] = useState(0);
  const [typingPos, setTypingPos] = useState(0);
  const [typingPos2, setTypingPos2] = useState(0);
  const [typingPos3, setTypingPos3] = useState(0);
  const [cursorX, setCursorX] = useState(50);
  const [cursorY, setCursorY] = useState(30);
  const [showCursor, setShowCursor] = useState(true);
  const [showEdgeOverlay, setShowEdgeOverlay] = useState(false);
  const [edgeType, setEdgeType] = useState<'support' | 'negation'>('support');

  const supportText = "30 min of exercise releases mood-boosting endorphins";
  const negationText = "Exercise requires time that could increase stress";
  const editedText = "Exercise can worsen injuries without proper guidance";

  const [nodes, setNodes] = useNodesState<Node>([
    {
      id: '1',
      type: 'tutorialPoint',
      position: { x: 250, y: 100 },
      data: { label: 'Regular exercise improves mental health', showPill: false },
    },
  ]);
  const [edges, setEdges] = useEdgesState<Edge>([]);

  // Main animation sequence
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (phase === 0) {
      // Cursor moving to node center
      timer = setTimeout(() => setPhase(1), 1200);
    } else if (phase === 1) {
      // Pill appears
      timer = setTimeout(() => setPhase(2), 800);
    } else if (phase === 2) {
      // Cursor moving to pill
      timer = setTimeout(() => setPhase(3), 1000);
    } else if (phase === 3) {
      // Single click on pill
      timer = setTimeout(() => setPhase(4), 200);
    } else if (phase === 4) {
      // "New Support" node + edge appear
      timer = setTimeout(() => setPhase(5), 600);
    } else if (phase === 5) {
      // Cursor moving to support node
      timer = setTimeout(() => setPhase(6), 1000);
    } else if (phase === 6) {
      // First click on support
      timer = setTimeout(() => setPhase(7), 200);
    } else if (phase === 7) {
      // Pause
      timer = setTimeout(() => setPhase(8), 200);
    } else if (phase === 8) {
      // Second click on support - hide cursor, start editing
      timer = setTimeout(() => { setShowCursor(false); setPhase(9); }, 200);
    } else if (phase === 9) {
      // Typing support text
      if (typingPos >= supportText.length) {
        timer = setTimeout(() => setPhase(10), 500);
      }
    } else if (phase === 10) {
      // Support done, cursor moving back to node center
      timer = setTimeout(() => { setShowCursor(true); setPhase(11); }, 500);
    } else if (phase === 11) {
      // Pill appears
      timer = setTimeout(() => setPhase(12), 800);
    } else if (phase === 12) {
      // Cursor moving to pill
      timer = setTimeout(() => setPhase(13), 1000);
    } else if (phase === 13) {
      // Single click on pill
      timer = setTimeout(() => setPhase(14), 200);
    } else if (phase === 14) {
      // "New Negation" node + edge appear
      timer = setTimeout(() => setPhase(15), 600);
    } else if (phase === 15) {
      // Cursor moving to negation node
      timer = setTimeout(() => setPhase(16), 1000);
    } else if (phase === 16) {
      // First click on negation
      timer = setTimeout(() => setPhase(17), 200);
    } else if (phase === 17) {
      // Pause
      timer = setTimeout(() => setPhase(18), 200);
    } else if (phase === 18) {
      // Second click on negation - hide cursor, start editing
      timer = setTimeout(() => { setShowCursor(false); setPhase(19); }, 200);
    } else if (phase === 19) {
      // Typing negation text
      if (typingPos2 >= negationText.length) {
        timer = setTimeout(() => { setShowCursor(true); setPhase(20); }, 500);
      }
    } else if (phase === 20) {
      // Cursor moves to edge
      timer = setTimeout(() => setPhase(21), 1000);
    } else if (phase === 21) {
      // Edge overlay appears
      timer = setTimeout(() => setPhase(22), 800);
    } else if (phase === 22) {
      // Click toggle
      timer = setTimeout(() => setPhase(23), 400);
    } else if (phase === 23) {
      // Cursor moves back to support node
      timer = setTimeout(() => { setShowCursor(true); setPhase(24); }, 1000);
    } else if (phase === 24) {
      // First click on support node
      timer = setTimeout(() => setPhase(25), 200);
    } else if (phase === 25) {
      // Pause
      timer = setTimeout(() => setPhase(26), 200);
    } else if (phase === 26) {
      // Second click on support node - hide cursor, start editing
      timer = setTimeout(() => { setShowCursor(false); setPhase(27); }, 200);
    } else if (phase === 27) {
      // Typing edited text
      if (typingPos3 >= editedText.length) {
        timer = setTimeout(() => {
          // Reset animation
          setPhase(0);
          setTypingPos(0);
          setTypingPos2(0);
          setTypingPos3(0);
          setCursorX(50);
          setCursorY(30);
          setShowCursor(true);
          setShowEdgeOverlay(false);
          setEdgeType('support');
        }, 2000);
      }
    }

    return () => clearTimeout(timer);
  }, [phase, typingPos, typingPos2, typingPos3, supportText.length, negationText.length, editedText.length]);

  // Cursor movement
  useEffect(() => {
    if (phase === 0) {
      // Move to node center
      const nodeCenterFlowX = 250 + 100;
      const nodeCenterFlowY = 100 + 25; // node center
      const targetX = 50 + nodeCenterFlowX * 0.6;
      const targetY = -20 + nodeCenterFlowY * 0.6;
      const step = () => {
        setCursorX(x => x + (targetX - x) * 0.12);
        setCursorY(y => y + (targetY - y) * 0.12);
      };
      const interval = setInterval(step, 16);
      return () => clearInterval(interval);
    } else if (phase === 2) {
      // Move to pill button
      const nodeCenterFlowX = 250 + 100;
      const nodeCenterFlowY = 100 + 50 + 40; // node y + node height + pill offset
      const targetX = 50 + nodeCenterFlowX * 0.6;
      const targetY = -20 + nodeCenterFlowY * 0.6;
      const step = () => {
        setCursorX(x => x + (targetX - x) * 0.12);
        setCursorY(y => y + (targetY - y) * 0.12);
      };
      const interval = setInterval(step, 16);
      return () => clearInterval(interval);
    } else if (phase === 5) {
      // Move to support node
      const supportNodeFlowX = 100 + 100; // node x + half width
      const supportNodeFlowY = 280 + 25; // node y + half height
      const targetX = 50 + supportNodeFlowX * 0.6;
      const targetY = -20 + supportNodeFlowY * 0.6;
      const step = () => {
        setCursorX(x => x + (targetX - x) * 0.12);
        setCursorY(y => y + (targetY - y) * 0.12);
      };
      const interval = setInterval(step, 16);
      return () => clearInterval(interval);
    } else if (phase === 10) {
      // Move back to main node center
      const nodeCenterFlowX = 250 + 100;
      const nodeCenterFlowY = 100 + 25;
      const targetX = 50 + nodeCenterFlowX * 0.6;
      const targetY = -20 + nodeCenterFlowY * 0.6;
      const step = () => {
        setCursorX(x => x + (targetX - x) * 0.12);
        setCursorY(y => y + (targetY - y) * 0.12);
      };
      const interval = setInterval(step, 16);
      return () => clearInterval(interval);
    } else if (phase === 12) {
      // Move to pill button
      const nodeCenterFlowX = 250 + 100;
      const nodeCenterFlowY = 100 + 50 + 40;
      const targetX = 50 + nodeCenterFlowX * 0.6;
      const targetY = -20 + nodeCenterFlowY * 0.6;
      const step = () => {
        setCursorX(x => x + (targetX - x) * 0.12);
        setCursorY(y => y + (targetY - y) * 0.12);
      };
      const interval = setInterval(step, 16);
      return () => clearInterval(interval);
    } else if (phase === 15) {
      // Move to negation node
      const negationNodeFlowX = 400 + 100;
      const negationNodeFlowY = 280 + 25;
      const targetX = 50 + negationNodeFlowX * 0.6;
      const targetY = -20 + negationNodeFlowY * 0.6;
      const step = () => {
        setCursorX(x => x + (targetX - x) * 0.12);
        setCursorY(y => y + (targetY - y) * 0.12);
      };
      const interval = setInterval(step, 16);
      return () => clearInterval(interval);
    } else if (phase === 20) {
      // Move to edge label position (between node 1 and node 2)
      // Node 1 center: (350, 125), Node 2 center: (200, 305)
      // Edge midpoint: (275, 215)
      // With viewport (x: 50, y: -20, zoom: 0.6)
      const targetX = 50 + 275 * 0.6 + 10; // ~225 (slightly right)
      const targetY = -20 + 215 * 0.6 - 6; // ~103 (slightly up)
      const step = () => {
        setCursorX(x => x + (targetX - x) * 0.12);
        setCursorY(y => y + (targetY - y) * 0.12);
      };
      const interval = setInterval(step, 16);
      return () => clearInterval(interval);
    } else if (phase === 23) {
      // Move back to support node
      const supportNodeFlowX = 100 + 100; // node x + half width
      const supportNodeFlowY = 280 + 25; // node y + half height
      const targetX = 50 + supportNodeFlowX * 0.6;
      const targetY = -20 + supportNodeFlowY * 0.6;
      const step = () => {
        setCursorX(x => x + (targetX - x) * 0.12);
        setCursorY(y => y + (targetY - y) * 0.12);
      };
      const interval = setInterval(step, 16);
      return () => clearInterval(interval);
    }
  }, [phase]);

  // Typing animations
  useEffect(() => {
    if (phase === 9 && typingPos < supportText.length) {
      const timer = setTimeout(() => setTypingPos(typingPos + 1), 50);
      return () => clearTimeout(timer);
    }
  }, [phase, typingPos, supportText.length]);

  useEffect(() => {
    if (phase === 19 && typingPos2 < negationText.length) {
      const timer = setTimeout(() => setTypingPos2(typingPos2 + 1), 50);
      return () => clearTimeout(timer);
    }
  }, [phase, typingPos2, negationText.length]);

  useEffect(() => {
    if (phase === 27 && typingPos3 < editedText.length) {
      const timer = setTimeout(() => setTypingPos3(typingPos3 + 1), 50);
      return () => clearTimeout(timer);
    }
  }, [phase, typingPos3, editedText.length]);

  // Update nodes
  useEffect(() => {
    const newNodes: Node[] = [{
      id: '1',
      type: 'tutorialPoint',
      position: { x: 250, y: 100 },
      data: {
        label: 'Regular exercise improves mental health',
        showPill: (phase >= 1 && phase <= 3) || (phase >= 11 && phase <= 13),
      },
    }];

    if (phase >= 4) {
      newNodes.push({
        id: '2',
        type: 'tutorialPoint',
        position: { x: 100, y: 280 },
        data: {
          label: phase >= 4 && phase <= 8
            ? 'New Support'
            : phase >= 24 && phase <= 26
              ? supportText
              : phase === 27
                ? editedText.substring(0, typingPos3)
                : supportText.substring(0, typingPos),
          isEditing: phase === 9 || phase === 27,
          cursorPos: phase === 27 ? typingPos3 : typingPos,
        },
      });
    }

    if (phase >= 14) {
      newNodes.push({
        id: '3',
        type: 'tutorialPoint',
        position: { x: 400, y: 280 },
        data: {
          label: phase >= 14 && phase <= 18 ? 'New Negation' : negationText.substring(0, typingPos2),
          isEditing: phase === 19,
          cursorPos: typingPos2,
        },
      });
    }

    setNodes(newNodes);
  }, [phase, typingPos, typingPos2, typingPos3, supportText, negationText, editedText, setNodes]);

  // Update edges
  useEffect(() => {
    const newEdges: Edge[] = [];

    if (phase >= 4) {
      newEdges.push({
        id: 'e1-2',
        source: '1',
        target: '2',
        type: phase >= 22 ? 'negation' : 'support',
        label: phase >= 20 && phase <= 22 ? (edgeType === 'support' ? 'Supports' : 'Negates') : undefined,
      });
    }

    if (phase >= 14) {
      newEdges.push({
        id: 'e1-3',
        source: '1',
        target: '3',
        type: 'negation',
      });
    }

    setEdges(newEdges);
  }, [phase, edgeType, setEdges]);

  // Edge overlay control
  useEffect(() => {
    if (phase === 21) {
      setShowEdgeOverlay(true);
      setEdgeType('support');
    } else if (phase === 22) {
      setEdgeType('negation');
    } else if (phase > 22) {
      setShowEdgeOverlay(false);
    }
  }, [phase]);

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
          {(phase === 3 || phase === 6 || phase === 8 || phase === 13 || phase === 16 || phase === 18 || phase === 22 || phase === 24 || phase === 26) && (
            <div className="absolute -left-3 -top-3 w-12 h-12" key={phase}>
              <div className="absolute inset-0 rounded-full bg-blue-400/40 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-blue-500/30 animate-ping" style={{ animationDelay: '75ms' }} />
            </div>
          )}

          <svg width="24" height="24" viewBox="0 0 24 24" className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] relative z-10">
            <g className={(phase === 3 || phase === 6 || phase === 8 || phase === 13 || phase === 16 || phase === 18 || phase === 22 || phase === 24 || phase === 26) ? 'animate-click-down' : ''}>
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

      {/* Edge overlay - positioned at edge label */}
      {showEdgeOverlay && (
        <div
          className="absolute"
          style={{
            left: `${50 + 275 * 0.6}px`,
            top: `${-20 + 215 * 0.6}px`,
            transform: 'translate(-50%, -50%)',
            zIndex: 2000,
          }}
        >
          <div className="flex items-center justify-center gap-4 bg-gradient-to-b from-white to-gray-50/95 backdrop-blur-md border border-gray-200/80 rounded-xl shadow-lg shadow-black/10 px-4 py-2.5">
            <div className="flex items-center gap-3 text-xs select-none">
              <span className={`font-bold tracking-tight ${edgeType === 'support' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {edgeType === 'support' ? 'Supports' : 'Negates'}
              </span>
              <div
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-gray-300/50 shadow-inner transition-all duration-200 ${
                  edgeType === 'support' ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-rose-400 to-rose-500'
                }`}
              >
                <div className={`pointer-events-none flex items-center justify-center h-5 w-5 rounded-full bg-white shadow-md transition-all duration-200 ${
                  edgeType === 'support' ? 'translate-x-5' : 'translate-x-0.5'
                }`}>
                  <div style={{ position: "relative", width: "12px", height: "12px" }}>
                    {edgeType === 'support' ? (
                      <>
                        <div style={{ position: "absolute", left: "50%", top: "50%", width: "10px", height: "2px", backgroundColor: "#10b981", transform: "translate(-50%, -50%) rotate(0deg)", borderRadius: "1px" }} />
                        <div style={{ position: "absolute", left: "50%", top: "50%", width: "10px", height: "2px", backgroundColor: "#10b981", transform: "translate(-50%, -50%) rotate(90deg)", borderRadius: "1px" }} />
                      </>
                    ) : (
                      <div style={{ position: "absolute", left: "50%", top: "50%", width: "10px", height: "2px", backgroundColor: "#f43f5e", transform: "translate(-50%, -50%) rotate(0deg)", borderRadius: "1px" }} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
