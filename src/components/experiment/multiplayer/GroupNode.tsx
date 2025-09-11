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
  const lastLayoutRef = useRef<{ width: number; height: number; positionsSig: string } | null>(null);
  const { deleteNode, deleteInversePair, commitGroupLayout } = useGraphActions() as any;
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (data?.isNew) {
      const timer = setTimeout(() => {
        setIsAnimating(true);
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [data?.isNew]);

  useEffect(() => {
    const packChildren = () => {
      if (data?.closing) return;
      const nodes = rf.getNodes();
      const children = nodes.filter((n: any) => n.parentId === id);
      if (children.length === 0) return;

      const gap = 25;
      const leftPadding = 8;
      const rightPadding = 8;
      const headerPadding = 28;
      const topPadding = headerPadding;
      const bottomPadding = 8;

      const sorted = [...children].sort((a: any, b: any) => (a.position?.x ?? 0) - (b.position?.x ?? 0));

      let cursorX = leftPadding;
      let tallest = 0;
      let maxRight = 0;
      const positions: Record<string, { x: number; y: number }> = {} as any;
      let hasUnmeasuredChild = false;

      sorted.forEach((child: any, index: number) => {
        const rawW = (child.width as number) ?? (child.measured?.width as number) ?? 0;
        const rawH = (child.height as number) ?? (child.measured?.height as number) ?? 0;
        const w = Number.isFinite(rawW) && rawW > 1 ? Math.ceil(rawW) : 160;
        const h = Number.isFinite(rawH) && rawH > 1 ? Math.ceil(rawH) : 80;
        if (!(Number.isFinite(rawW) && rawW > 1) || !(Number.isFinite(rawH) && rawH > 1)) {
          hasUnmeasuredChild = true;
        }
        const x = cursorX;
        positions[child.id] = { x, y: topPadding };
        const rightEdge = x + w;
        if (rightEdge > maxRight) maxRight = rightEdge;
        cursorX = x + w + (index < sorted.length - 1 ? gap : 0);
        if (h > tallest) tallest = h;
      });

      const newWidth = Math.ceil(maxRight + rightPadding);
      const newHeight = Math.ceil(topPadding + tallest + bottomPadding);

      const positionsSig = Object.keys(positions)
        .sort()
        .map((k) => `${k}:${positions[k].x},${positions[k].y}`)
        .join('|');
      const last = lastLayoutRef.current;
      if (last && last.width === newWidth && last.height === newHeight && last.positionsSig === positionsSig) {
        updateNodeInternals(id);
        return;
      }
      lastLayoutRef.current = { width: newWidth, height: newHeight, positionsSig };

      // If any child is unmeasured, defer committing layout to avoid overlapping at x=leftPadding
      if (hasUnmeasuredChild) {
        // Ensure container reflects tentative size so future measures stabilize
        const container = containerRef.current;
        if (container) {
          container.style.width = `${newWidth}px`;
          container.style.height = `${newHeight}px`;
        }
        window.requestAnimationFrame(() => packChildren());
        return;
      }

      // Apply container size before committing so peers and local visuals align
      const container = containerRef.current;
      if (container) {
        container.style.width = `${newWidth}px`;
        container.style.height = `${newHeight}px`;
      }

      // Persist layout to shared state so peers stay in sync
      try {
        commitGroupLayout?.(id, positions, newWidth, newHeight);
      } catch { }

      // Avoid local setNodes that overwrite live drag positions; rely on shared state commit
      updateNodeInternals(id);
    };

    const t = setTimeout(packChildren, 0);
    const observer = new ResizeObserver(() => { packChildren(); });
    const nodes = rf.getNodes();
    const children = nodes.filter((n: any) => n.parentId === id);
    children.forEach((child: any) => {
      const el = document.querySelector(`.react-flow__node[data-id="${child.id}"]`);
      if (el) observer.observe(el as Element);
    });
    const containerEl = containerRef.current;
    if (containerEl) observer.observe(containerEl);
    return () => { clearTimeout(t); observer.disconnect(); };
  }, [id, rf, updateNodeInternals, data?.closing, commitGroupLayout]);


  return (
    <>
      <style jsx>{`
        :global(.react-flow__node[data-id="${id}"]) {
          border: none !important;
          background: transparent !important;
          padding: 0 !important;
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
        {/* Animated white fill overlay */}
        <div className={`absolute top-0 left-0 right-0 bottom-0 rounded pointer-events-none px-2 py-2 ${data?.isNew && !isAnimating ? 'bg-grow-start' : (data?.closing ? 'bg-close' : 'bg-grow-end')}`} style={{ backgroundColor: 'white', opacity: 0.8, border: '2px solid black', zIndex: 0 }} />
        <div className="group-drag-handle absolute top-0 left-0 right-0 h-7 cursor-move px-1 py-0.5 text-xs font-semibold tracking-wide rounded-t opacity-90 z-20 select-none">
          {data?.label ?? ''}
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
