"use client";

import { ReactFlow, Background, Node, Edge, Handle, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { memo } from 'react';
import { SupportEdge } from '@/components/experiment/multiplayer/SupportEdge';
import { ObjectionEdge } from '@/components/experiment/multiplayer/ObjectionEdge';
import { GraphProvider } from '@/components/experiment/multiplayer/GraphContext';

const noop = () => { };

const landingGraphActions = {
  updateNodeContent: noop,
  deleteNode: noop,
  beginConnectFromNode: noop,
  cancelConnect: noop,
  isConnectingFromNodeId: null,
  addObjectionForEdge: noop,
  hoveredEdgeId: null,
  setHoveredEdge: noop,
  updateEdgeAnchorPosition: noop,
  beginConnectFromEdge: noop,
  completeConnectToEdge: noop,
  clearNodeSelection: noop,
  updateEdgeType: noop,
  setSelectedEdge: noop,
  grabMode: true,
  connectMode: false,
};

const DemoPointNode = memo(({ data }: { data: { content: string } }) => {
  return (
    <div className="relative bg-white text-gray-900 border-2 border-stone-200 px-4 py-3 rounded-lg min-w-[200px] max-w-[320px] shadow-md">
      <div className="text-sm leading-relaxed whitespace-pre-wrap break-words text-gray-900">
        {data.content}
      </div>
      <Handle type="source" position={Position.Right} className="opacity-0" isConnectable={false} />
      <Handle type="target" position={Position.Left} className="opacity-0" isConnectable={false} />
    </div>
  );
});
DemoPointNode.displayName = 'DemoPointNode';

const DemoObjectionNode = memo(({ data }: { data: { content: string } }) => {
  return (
    <div className="relative bg-amber-100 text-amber-900 border-2 border-amber-300 px-4 py-3 rounded-xl min-w-[200px] max-w-[320px] shadow-md">
      <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
        {data.content}
      </div>
      <Handle type="source" position={Position.Bottom} className="opacity-0" isConnectable={false} />
    </div>
  );
});
DemoObjectionNode.displayName = 'DemoObjectionNode';

const DemoEdgeAnchorNode = memo(() => {
  return (
    <div className="relative h-2 w-2">
      <Handle type="target" position={Position.Top} className="opacity-0" isConnectable={false} />
    </div>
  );
});
DemoEdgeAnchorNode.displayName = 'DemoEdgeAnchorNode';

const nodeTypes = {
  point: DemoPointNode,
  objection: DemoObjectionNode,
  edge_anchor: DemoEdgeAnchorNode,
};

const edgeTypes = {
  support: SupportEdge,
  objection: ObjectionEdge,
};

const howItWorksVideoSrc = "https://www.youtube-nocookie.com/embed/h81ED2ybWaQ?rel=0&modestbranding=1&playsinline=1";

const supportEdgeId = 'support-edge';
const supportAnchorId = `anchor:${supportEdgeId}`;

const initialNodes: Node[] = [
  {
    id: 'support-evidence',
    type: 'point',
    position: { x: 20, y: 140 },
    data: { content: '30 min of exercise releases mood-boosting endorphins' },
  },
  {
    id: 'support-claim',
    type: 'point',
    position: { x: 420, y: 140 },
    data: { content: 'Regular exercise improves mental health' },
  },
  {
    id: supportAnchorId,
    type: 'edge_anchor',
    position: { x: 330, y: 165 },
    data: { parentEdgeId: supportEdgeId },
    draggable: false,
    selectable: false,
  },
  {
    id: 'objection',
    type: 'objection',
    position: { x: 230, y: 0 },
    data: { content: 'Endorphins fade quickly, so a 30-minute session does not reliably improve long-term mental health.', parentEdgeId: supportEdgeId },
  },
];

const initialEdges: Edge[] = [
  {
    id: supportEdgeId,
    source: 'support-evidence',
    target: 'support-claim',
    type: 'support',
  },
  {
    id: 'objection-edge',
    source: 'objection',
    target: supportAnchorId,
    type: 'objection',
  },
];

export function ShowcaseSection() {
  return (
    <section id="how" className="px-8 py-20">
      <div className="mx-auto max-w-[1400px]">
        <div className="text-center mb-16">
          <div className="inline-block mb-4 text-sm font-bold uppercase tracking-[0.6px] text-[#4285f4]">
            How it works
          </div>
          <h2 className="mb-4 text-[clamp(32px,4vw,48px)] font-[750] tracking-[-0.6px]">
            Map a decision live or asynchronously. On your own or with your team and stakeholders.
          </h2>
          <p className="mx-auto max-w-[680px] text-lg text-[#5a6370]">
            Claims are explicit. Objections attach to specific points. Six months later, you can see what mattered and why.
          </p>
        </div>

        <div className="mx-auto mb-16 max-w-[980px]">
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-[#e1e4e8] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
            <iframe
              className="absolute inset-0 h-full w-full"
              src={howItWorksVideoSrc}
              title="Negation Game overview"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>

        <div className="grid gap-12 sm:grid-cols-2 mt-14">
          {/* Board Dashboard - scaled down miniature */}
          <div className="bg-white p-10 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-[#e1e4e8] transition-all hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:-translate-y-1">
            <div className="mb-6 aspect-[2/1] rounded-xl border border-[#e1e4e8] bg-white p-6 relative overflow-hidden">
              {/* Owned by you section header */}
              <div className="mb-3 flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="text-[11px] font-semibold text-stone-800">Owned by you</div>
              </div>

              {/* Board cards grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Create New Card */}
                <div className="border-2 border-dashed border-stone-300 rounded-lg p-3 flex flex-col items-center justify-center bg-stone-50/30">
                  <div className="w-5 h-5 rounded-full bg-stone-100 flex items-center justify-center mb-1">
                    <svg className="w-3 h-3 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div className="text-[9px] font-semibold text-stone-700">Create New</div>
                </div>

                {/* Board Card 1 */}
                <div className="bg-white border border-stone-200 rounded-lg p-2.5 shadow-sm">
                  <div className="text-[11px] font-medium text-blue-600 leading-tight mb-1.5">Product roadmap Q1</div>
                  <div className="flex items-center gap-1 text-[9px] text-stone-600">
                    <div className="w-3.5 h-3.5 rounded-full bg-stone-200 flex items-center justify-center text-[8px]">J</div>
                    <span>john</span>
                  </div>
                </div>

                {/* Board Card 2 */}
                <div className="bg-white border border-stone-200 rounded-lg p-2.5 shadow-sm">
                  <div className="text-[11px] font-medium text-blue-600 leading-tight mb-1.5">API migration strategy</div>
                  <div className="flex items-center gap-1 text-[9px] text-stone-600">
                    <div className="w-3.5 h-3.5 rounded-full bg-stone-200 flex items-center justify-center text-[8px]">S</div>
                    <span>sarah</span>
                  </div>
                </div>

                {/* Board Card 3 */}
                <div className="bg-white border border-stone-200 rounded-lg p-2.5 shadow-sm">
                  <div className="text-[11px] font-medium text-blue-600 leading-tight mb-1.5">Feature prioritization</div>
                  <div className="flex items-center gap-1 text-[9px] text-stone-600">
                    <div className="w-3.5 h-3.5 rounded-full bg-stone-200 flex items-center justify-center text-[8px]">A</div>
                    <span>alex</span>
                  </div>
                </div>
              </div>

              {/* Shared with you section header */}
              <div className="mb-3 flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-green-100 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="text-[11px] font-semibold text-stone-800">Shared with you</div>
              </div>

              {/* Shared board cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border border-stone-200 rounded-lg p-2.5 shadow-sm">
                  <div className="text-[11px] font-medium text-blue-600 leading-tight mb-1.5">Pricing model review</div>
                  <div className="flex items-center gap-1 text-[9px] text-stone-600">
                    <div className="w-3.5 h-3.5 rounded-full bg-stone-200 flex items-center justify-center text-[8px]">M</div>
                    <span>maria</span>
                  </div>
                </div>
              </div>
            </div>
            <h3 className="mb-3 text-[22px] font-bold tracking-[-0.2px]">
              Organize all decisions in one place
            </h3>
            <p className="text-[#5a6370] text-base leading-[1.6]">
              Create boards for initiatives. Share with stakeholders. History and context stay attached.
            </p>
          </div>

          {/* Graph View */}
          <div className="bg-white p-10 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-[#e1e4e8] transition-all hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:-translate-y-1">
            <div className="mb-6 aspect-[2/1] rounded-xl border border-[#e1e4e8] bg-[#f8f9fa] p-6 relative overflow-hidden">
              <GraphProvider value={landingGraphActions}>
                <ReactFlow
                  className="w-full h-full"
                  nodes={initialNodes}
                  edges={initialEdges}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  proOptions={{ hideAttribution: true }}
                  fitView
                  fitViewOptions={{ padding: 0.5 }}
                  nodesDraggable={false}
                  nodesConnectable={false}
                  elementsSelectable={false}
                  preventScrolling={false}
                  panOnDrag={false}
                  zoomOnScroll={false}
                  zoomOnPinch={false}
                  zoomOnDoubleClick={false}
                >
                  <Background color="#e5e7eb" gap={24} />
                </ReactFlow>
              </GraphProvider>
            </div>
            <h3 className="mb-3 text-[22px] font-bold tracking-[-0.2px]">
              Map where disagreement actually is
            </h3>
            <p className="text-[#5a6370] text-base leading-[1.6]">
              Objections attach to claims. Conditions and consequences are explicit. No more talking past each other.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
