import React, { useEffect, useState } from 'react';
import { NodeResizer, useUpdateNodeInternals, useReactFlow } from '@xyflow/react';

interface GroupNodeProps {
  id: string;
  data: {
    label?: string;
    isNew?: boolean;
    collapsed?: boolean;
  };
  selected?: boolean;
}

export const GroupNode: React.FC<GroupNodeProps> = ({ id, data, selected }) => {
  const updateNodeInternals = useUpdateNodeInternals();
  const rf = useReactFlow();
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (data?.isNew) {
      const timer = setTimeout(() => {
        setIsAnimating(true);
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [data?.isNew]);


  return (
    <>
      <style jsx>{`
        :global(.react-flow__node[data-id="${id}"]) {
          border: none !important;
          background: transparent !important;
          box-shadow: none !important;
        }
        :global(.react-flow__node[data-id="${id}"].selected) {
          border: none !important;
          box-shadow: none !important;
        }
        .bg-grow-start {
          transform: scaleX(0);
          transform-origin: left;
        }
        .bg-grow-end {
          transform: scaleX(1);
          transform-origin: left;
          transition: transform 440ms ease-in;
        }
      `}</style>
      <div className={`w-full h-full rounded bg-transparent relative`}>
        {/* Animated outline overlay */}
        <div className={`absolute inset-0 rounded border border-neutral-300 pointer-events-none ${data?.isNew && !isAnimating ? 'bg-grow-start' : 'bg-grow-end'}`} />
        <div className="drag-handle sticky top-0 left-0 w-full bg-transparent px-2 py-1.5 text-xs font-semibold tracking-wide rounded-t opacity-90 z-10">
          {data?.label ?? ""}
        </div>
        <NodeResizer
          isVisible={selected}
          minWidth={160}
          minHeight={120}
          onResize={() => { if (rf.getNode(id)) updateNodeInternals(id); }}
          onResizeEnd={() => { if (rf.getNode(id)) updateNodeInternals(id); }}
          lineStyle={{ border: "none" }}
          handleStyle={{ opacity: 0, width: 10, height: 10 }}
        />
      </div>
    </>
  );
};
