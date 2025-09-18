import React from 'react';
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
  const { deleteNode, deleteInversePair, commitGroupLayout } = useGraphActions() as any;

  const [isAnimating, setIsAnimating] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const lastLayoutRef = React.useRef<{ width: number; height: number; positionsSig: string } | null>(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [menuPos, setMenuPos] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });

  React.useEffect(() => {
    if (!data?.isNew) return;
    const timer = window.setTimeout(() => setIsAnimating(true), 50);
    return () => window.clearTimeout(timer);
  }, [data?.isNew]);

  const childrenForNode = React.useCallback(() => {
    return rf.getNodes().filter((node: any) => node.parentId === id);
  }, [rf, id]);

  const commitLayout = React.useCallback(() => {
    if (data?.closing) return;
    const children = childrenForNode();
    if (children.length === 0) return;

    const GAP = 25;
    const LEFT = 8;
    const RIGHT = 8;
    const HEADER = 28;
    const BOTTOM = 8;

    let cursorX = LEFT;
    let tallest = 0;
    let maxRight = 0;
    const positions: Record<string, { x: number; y: number }> = {};
    let hasUnmeasuredChild = false;

    const sorted = [...children].sort((a: any, b: any) => (a.position?.x ?? 0) - (b.position?.x ?? 0));
    sorted.forEach((child: any, index: number) => {
      const rawW = (child.width as number) ?? (child.measured?.width as number) ?? 0;
      const rawH = (child.height as number) ?? (child.measured?.height as number) ?? 0;
      const width = Number.isFinite(rawW) && rawW > 1 ? Math.ceil(rawW) : 160;
      const height = Number.isFinite(rawH) && rawH > 1 ? Math.ceil(rawH) : 80;
      if (!(Number.isFinite(rawW) && rawW > 1) || !(Number.isFinite(rawH) && rawH > 1)) {
        hasUnmeasuredChild = true;
      }
      positions[child.id] = { x: cursorX, y: HEADER };
      const rightEdge = cursorX + width;
      if (rightEdge > maxRight) maxRight = rightEdge;
      cursorX = cursorX + width + (index < sorted.length - 1 ? GAP : 0);
      if (height > tallest) tallest = height;
    });

    const width = Math.ceil(maxRight + RIGHT);
    const height = Math.ceil(HEADER + tallest + BOTTOM);
    const signature = Object.keys(positions)
      .sort()
      .map((key) => `${key}:${positions[key].x},${positions[key].y}`)
      .join('|');

    const last = lastLayoutRef.current;
    if (last && last.width === width && last.height === height && last.positionsSig === signature) {
      updateNodeInternals(id);
      return;
    }

    lastLayoutRef.current = { width, height, positionsSig: signature };

    const containerEl = containerRef.current;
    if (containerEl) {
      containerEl.style.width = `${width}px`;
      containerEl.style.height = `${height}px`;
    }

    if (hasUnmeasuredChild) {
      window.requestAnimationFrame(commitLayout);
      return;
    }

    try {
      commitGroupLayout?.(id, positions, width, height);
    } catch { }

    updateNodeInternals(id);
  }, [childrenForNode, commitGroupLayout, data?.closing, id, updateNodeInternals]);

  React.useEffect(() => {
    commitLayout();

    const observer = new ResizeObserver(() => commitLayout());
    childrenForNode().forEach((child: any) => {
      const element = document.querySelector(`.react-flow__node[data-id="${child.id}"]`);
      if (element) observer.observe(element);
    });
    const containerEl = containerRef.current;
    if (containerEl) observer.observe(containerEl);

    return () => observer.disconnect();
  }, [commitLayout, childrenForNode]);


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
