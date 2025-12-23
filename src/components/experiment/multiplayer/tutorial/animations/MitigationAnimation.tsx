'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ReactFlow, ReactFlowProvider, Node, Edge, Background, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { edgeTypes } from '../../componentRegistry';
import { TutorialGraphProvider } from '../TutorialGraphProvider';
import { tutorialNodeTypes } from '../TutorialPointNode';
import EdgeAnchorNode from '../../objection/EdgeAnchorNode';
import { computeMidpointBetweenBorders } from '@/utils/experiment/multiplayer/edgePathUtils';
import { EdgeTypeToggle } from '../../common/EdgeTypeToggle';

const nodeWidth = 280;
const nodeHeight = 64;
const topNodePos = { x: 140, y: 20 };
const bottomNodePos = { x: 140, y: 360 };
const anchorSize = 4;
const mitigationOffsetX = 300;
const mitigationText = 'Endorphins fade quickly, so a 30-minute session does not reliably improve long-term mental health.';

export function MitigationAnimation() {
  const [phase, setPhase] = useState(0);
  const [cursorX, setCursorX] = useState(30);
  const [cursorY, setCursorY] = useState(30);
  const [showCursor, setShowCursor] = useState(true);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showMitigation, setShowMitigation] = useState(false);
  const [typingPos, setTypingPos] = useState(0);
  const [edgeType, setEdgeType] = useState<'support' | 'negation'>('support');

  const viewport = useMemo(() => ({ x: 30, y: -10, zoom: 0.52 }), []);

  const edgeMidFlow = useMemo(() => {
    const topCenterX = topNodePos.x + nodeWidth / 2;
    const topCenterY = topNodePos.y + nodeHeight / 2;
    const bottomCenterX = bottomNodePos.x + nodeWidth / 2;
    const bottomCenterY = bottomNodePos.y + nodeHeight / 2;
    const [midX, midY] = computeMidpointBetweenBorders(
      { position: topNodePos, width: nodeWidth, height: nodeHeight },
      { position: bottomNodePos, width: nodeWidth, height: nodeHeight },
      (topCenterX + bottomCenterX) / 2,
      (topCenterY + bottomCenterY) / 2
    );
    return { x: midX, y: midY };
  }, []);

  const edgeMidScreen = useMemo(() => ({
    x: viewport.x + edgeMidFlow.x * viewport.zoom,
    y: viewport.y + edgeMidFlow.y * viewport.zoom,
  }), [edgeMidFlow.x, edgeMidFlow.y, viewport.x, viewport.y, viewport.zoom]);

  const mitigationCenterFlow = useMemo(() => ({
    x: edgeMidFlow.x + mitigationOffsetX,
    y: edgeMidFlow.y,
  }), [edgeMidFlow.x, edgeMidFlow.y]);

  const mitigationCenterScreen = useMemo(() => ({
    x: viewport.x + mitigationCenterFlow.x * viewport.zoom,
    y: viewport.y + mitigationCenterFlow.y * viewport.zoom,
  }), [mitigationCenterFlow.x, mitigationCenterFlow.y, viewport.x, viewport.y, viewport.zoom]);

  const labelTargetX = edgeMidScreen.x - 8;
  const labelTargetY = edgeMidScreen.y - 6;
  const buttonTargetX = edgeMidScreen.x + 64;
  const buttonTargetY = edgeMidScreen.y - 4;

  const baseNodes = useMemo<Node[]>(() => ([
    {
      id: '1',
      type: 'tutorialPoint',
      position: topNodePos,
      style: { width: nodeWidth },
      data: { label: 'Regular exercise improves mental health' },
    },
    {
      id: '2',
      type: 'tutorialPoint',
      position: bottomNodePos,
      style: { width: nodeWidth },
      data: { label: '30 min of exercise releases endorphins' },
    },
  ]), []);

  const baseEdges = useMemo<Edge[]>(() => ([
    {
      id: 'e1',
      source: '2',
      target: '1',
      type: edgeType,
    },
  ]), [edgeType]);

  const mitigationPos = useMemo(
    () => ({ x: edgeMidFlow.x + mitigationOffsetX - nodeWidth / 2, y: edgeMidFlow.y - nodeHeight / 2 }),
    [edgeMidFlow.x, edgeMidFlow.y]
  );

  const anchorNode = useMemo<Node>(() => ({
    id: 'anchor:e1',
    type: 'edge_anchor',
    position: { x: edgeMidFlow.x - anchorSize / 2, y: edgeMidFlow.y - anchorSize / 2 },
    data: { parentEdgeId: 'e1' },
  }), [edgeMidFlow.x, edgeMidFlow.y]);

  const objectionEdge = useMemo<Edge>(() => ({
    id: 'e-m1',
    source: 'm1',
    target: 'anchor:e1',
    type: 'objection',
  }), []);

  const [nodes, setNodes] = useNodesState<Node>(baseNodes);
  const [edges, setEdges] = useEdgesState<Edge>(baseEdges);

  useEffect(() => {
    if (showMitigation) {
      const mitigationLabel = phase < 7
        ? 'New Objection'
        : phase === 7
          ? mitigationText.substring(0, typingPos)
          : mitigationText;
      setNodes([
        ...baseNodes,
        anchorNode,
        {
          id: 'm1',
          type: 'tutorialPoint',
          position: mitigationPos,
          style: { width: nodeWidth },
          data: {
            label: mitigationLabel,
            variant: 'mitigation',
            isEditing: phase === 7,
            cursorPos: typingPos,
          },
        },
      ]);
      setEdges([...baseEdges, objectionEdge]);
      return;
    }
    setNodes(baseNodes);
    setEdges(baseEdges);
  }, [showMitigation, baseNodes, baseEdges, anchorNode, objectionEdge, setNodes, setEdges, phase, typingPos, mitigationPos]);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (phase === 0) {
      setShowOverlay(false);
      setShowMitigation(false);
      setTypingPos(0);
      setEdgeType('support');
      setShowCursor(true);
      timer = setTimeout(() => setPhase(1), 1200);
    } else if (phase === 1) {
      setShowOverlay(true);
      timer = setTimeout(() => setPhase(2), 600);
    } else if (phase === 2) {
      timer = setTimeout(() => setPhase(3), 800);
    } else if (phase === 3) {
      timer = setTimeout(() => {
        setShowOverlay(false);
        setShowMitigation(true);
        setPhase(4);
      }, 200);
    } else if (phase === 4) {
      timer = setTimeout(() => setPhase(5), 900);
    } else if (phase === 5) {
      timer = setTimeout(() => setPhase(6), 200);
    } else if (phase === 6) {
      timer = setTimeout(() => {
        setShowCursor(false);
        setPhase(7);
      }, 200);
    } else if (phase === 7) {
      if (typingPos >= mitigationText.length) {
        timer = setTimeout(() => {
          setShowCursor(true);
          setPhase(8);
        }, 600);
      }
    } else if (phase === 8) {
      timer = setTimeout(() => {
        setPhase(0);
        setShowMitigation(false);
        setCursorX(30);
        setCursorY(30);
        setShowCursor(true);
        setEdgeType('support');
      }, 2000);
    }

    return () => clearTimeout(timer);
  }, [phase, typingPos]);

  useEffect(() => {
    if (phase !== 0) return;
    const step = () => {
      setCursorX((x) => x + (labelTargetX - x) * 0.12);
      setCursorY((y) => y + (labelTargetY - y) * 0.12);
    };
    const interval = setInterval(step, 16);
    return () => clearInterval(interval);
  }, [phase, labelTargetX, labelTargetY]);

  useEffect(() => {
    if (phase !== 2) return;
    const step = () => {
      setCursorX((x) => x + (buttonTargetX - x) * 0.12);
      setCursorY((y) => y + (buttonTargetY - y) * 0.12);
    };
    const interval = setInterval(step, 16);
    return () => clearInterval(interval);
  }, [phase, buttonTargetX, buttonTargetY]);

  useEffect(() => {
    if (phase !== 4) return;
    const step = () => {
      setCursorX((x) => x + (mitigationCenterScreen.x - x) * 0.12);
      setCursorY((y) => y + (mitigationCenterScreen.y - y) * 0.12);
    };
    const interval = setInterval(step, 16);
    return () => clearInterval(interval);
  }, [phase, mitigationCenterScreen.x, mitigationCenterScreen.y]);

  useEffect(() => {
    if (phase === 7 && typingPos < mitigationText.length) {
      const timer = setTimeout(() => setTypingPos((pos) => pos + 1), 40);
      return () => clearTimeout(timer);
    }
  }, [phase, typingPos]);

  return (
    <div className="relative w-full h-64">
      <ReactFlowProvider>
        <TutorialGraphProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={{ ...tutorialNodeTypes, edge_anchor: EdgeAnchorNode }}
            edgeTypes={edgeTypes}
            defaultViewport={viewport}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            proOptions={{ hideAttribution: true }}
            minZoom={viewport.zoom}
            maxZoom={viewport.zoom}
          >
            <Background />
          </ReactFlow>
        </TutorialGraphProvider>
      </ReactFlowProvider>

      {showOverlay && (
        <div
          className="absolute pointer-events-none"
          style={{ left: `${edgeMidScreen.x}px`, top: `${edgeMidScreen.y}px`, transform: 'translate(-50%, -50%)', zIndex: 1200 }}
        >
          <div className="flex items-center justify-center gap-4 bg-gradient-to-b from-white to-gray-50/95 backdrop-blur-md border border-gray-200/80 rounded-xl shadow-lg shadow-black/10 px-4 py-2.5">
            <EdgeTypeToggle
              edgeType={edgeType}
              onToggle={() => setEdgeType((prev) => (prev === 'support' ? 'negation' : 'support'))}
              onMouseEnter={() => {}}
              onMouseLeave={() => {}}
            />
            <button
              type="button"
              className="rounded-lg px-4 py-1.5 text-xs font-semibold bg-gradient-to-b from-gray-800 to-gray-900 text-white shadow-md border border-gray-700"
            >
              Mitigate
            </button>
          </div>
        </div>
      )}

      {showCursor && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${cursorX}px`,
            top: `${cursorY}px`,
            zIndex: 2001,
          }}
        >
          {(phase === 3 || phase === 5 || phase === 6) && (
            <div className="absolute -left-3 -top-3 w-12 h-12" key={`click-${phase}`}>
              <div className="absolute inset-0 rounded-full bg-blue-400/40 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-blue-500/30 animate-ping" style={{ animationDelay: '75ms' }} />
            </div>
          )}

          <svg width="24" height="24" viewBox="0 0 24 24" className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] relative z-10">
            <g
              key={`cursor-${phase}`}
              className={(phase === 3 || phase === 5 || phase === 6) ? 'animate-click-down' : ''}
            >
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
