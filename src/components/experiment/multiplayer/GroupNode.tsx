import React, { useEffect, useState, useRef } from 'react';
import { useUpdateNodeInternals, useReactFlow } from '@xyflow/react';
import { useGraphActions } from './GraphContext';
import { ContextMenu } from './common/ContextMenu';

interface GroupNodeProps {
  id: string;
  data: {
    label?: string;
    isNew?: boolean;
    collapsed?: boolean;
    closing?: boolean;
  };
  selected?: boolean;
}

export const GroupNode: React.FC<GroupNodeProps> = ({ id, data, selected }) => {
  const updateNodeInternals = useUpdateNodeInternals();
  const rf = useReactFlow();
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { deleteNode, deleteInversePair } = useGraphActions() as any;
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Debug log when data changes
  useEffect(() => {
    console.log(`GROUP NODE ${id} - data changed:`, data);
    if (data?.closing) {
      console.log(`GROUP NODE ${id} - CLOSING ANIMATION TRIGGERED - applying container-close class`);
    }
  }, [id, data]);

  useEffect(() => {
    if (data?.isNew) {
      const timer = setTimeout(() => {
        setIsAnimating(true);
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [data?.isNew]);

  // Dynamic height adjustment based on child node heights
  useEffect(() => {
    const adjustGroupHeight = () => {
      if (data?.closing) return;
      const nodes = rf.getNodes();
      const children = nodes.filter((n: any) => n.parentId === id);
      if (children.length === 0) return;
      let maxChildHeight = 0;
      children.forEach((child: any) => {
        const childEl = document.querySelector(`.react-flow__node[data-id="${child.id}"]`) as HTMLElement;
        if (childEl) {
          const height = childEl.getBoundingClientRect().height;
          if (height > maxChildHeight) maxChildHeight = height;
        }
      });
      if (maxChildHeight <= 0) return;
      const padding = 36;
      const newHeight = maxChildHeight + padding;
      rf.setNodes((nds: any[]) =>
        nds.map((n: any) =>
          n.id === id
            ? {
                ...n,
                height: newHeight,
                style: { ...(n.style || {}), height: newHeight },
                position: n.position,
              }
            : n
        )
      );
      updateNodeInternals(id);
    };

    const timer = setTimeout(adjustGroupHeight, 150);
    const observer = new ResizeObserver(() => { adjustGroupHeight(); });
    const nodes = rf.getNodes();
    const children = nodes.filter((n: any) => n.parentId === id);
    children.forEach((child: any) => {
      const childEl = document.querySelector(`.react-flow__node[data-id="${child.id}"]`);
      if (childEl) observer.observe(childEl);
    });
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, [id, rf, updateNodeInternals, data?.closing]);


  return (
    <>
      <style jsx>{`
        :global(.react-flow__node[data-id="${id}"]) {
          border: none !important;
          background: transparent !important;
          box-shadow: none !important;
          transition: width 600ms ease-in-out, height 400ms ease-in-out !important;
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
          transition: transform 600ms ease-in-out;
        }
        .bg-close {
          transform: scaleX(0);
          transform-origin: right;
          transition: transform 600ms ease-in-out;
        }
        .container-open {
          transform-origin: top left;
          transform: translateZ(0);
        }
        .container-close {
          transform-origin: right center;
          transform: scaleX(0);
          transition: transform 600ms ease-in-out;
        }
      `}</style>
      <div
        ref={containerRef}
        className="w-full h-full rounded bg-transparent relative"
        style={{
          border: data?.closing ? '2px solid black' : undefined,
          transform: data?.closing ? 'scaleX(0)' : 'scaleX(1)',
          transformOrigin: 'left top',
          transition: 'transform 600ms ease-in-out',
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenuPos({ x: e.clientX, y: e.clientY });
          setMenuOpen(true);
        }}
      >
        {/* Animated outline overlay */}
        <div className={`absolute inset-0 rounded border border-neutral-300 pointer-events-none ${data?.isNew && !isAnimating ? 'bg-grow-start' : (data?.closing ? 'bg-close' : 'bg-grow-end')}`} />
        <div className="drag-handle sticky top-0 left-0 w-full bg-transparent px-2 py-1.5 text-xs font-semibold tracking-wide rounded-t opacity-90 z-10">
          {data?.label ?? ""}
        </div>
      </div>
      <ContextMenu
        open={menuOpen}
        x={menuPos.x}
        y={menuPos.y}
        onClose={() => setMenuOpen(false)}
        items={[
          {
            label: 'Delete group',
            danger: true,
            onClick: () => {
              // Prefer inverse-pair deletion if we can find the inverse child
              const children = (rf.getNodes() as any[]).filter((n: any) => n.parentId === id);
              const inverse = children.find((n: any) => (n.data || {}).directInverse);
              if (inverse && deleteInversePair) {
                deleteInversePair(inverse.id);
              } else if (deleteNode) {
                deleteNode(id);
              }
            },
          },
        ]}
      />
    </>
  );
};
