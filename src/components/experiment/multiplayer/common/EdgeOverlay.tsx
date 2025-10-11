import React from 'react';
import { EdgeLabelRenderer, useReactFlow, useStore } from '@xyflow/react';
import { createPortal } from 'react-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useGraphActions } from '../GraphContext';

const EDGE_ANCHOR_SIZE = 36;
const PERSISTENCE_PADDING = 14;
const INTERACTIVE_TARGET_SELECTOR = 'button, [role="button"], a, input, textarea, select, [data-interactive="true"]';

// commented to death because i spent like 3 hours on this

export interface EdgeOverlayProps {
  cx: number;
  cy: number;
  isHovered: boolean;
  selected?: boolean;
  relevance: number;
  edgeId: string;
  edgeType?: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onUpdateRelevance: (relevance: number) => void;
  onAddObjection: () => void;
  onToggleEdgeType?: () => void;
  onConnectionClick?: () => void;
  starColor?: string;
}

export const EdgeOverlay: React.FC<EdgeOverlayProps> = ({
  cx,
  cy,
  isHovered,
  selected = false,
  relevance,
  edgeType,
  onMouseEnter,
  onMouseLeave,
  onUpdateRelevance,
  onAddObjection,
  onToggleEdgeType,
  onConnectionClick,
  starColor = 'text-stone-600',
}) => {
  const [isAnchorHovered, setIsAnchorHovered] = React.useState(false);
  const [isTooltipHovered, setIsTooltipHovered] = React.useState(false);
  const reactFlow = useReactFlow();
  const { grabMode = false, connectMode = false } = useGraphActions();

  // React Flow viewport transform: [translateX, translateY, zoom]
  const [tx, ty, zoom] = useStore((s: any) => s.transform);

  // Where we'll render the floating HUD
  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  // Convert graph coords -> screen coords
  const screenLeft = tx + cx * zoom;
  const screenTop = ty + cy * zoom;

  // Calculate offset based on actual scaled HUD size for proper positioning
  // When zoomed in, HUD appears larger and needs more clearance
  // When zoomed out, HUD appears smaller and needs less clearance
  const baseHUDHeight = 43;
  const scaledHUDHeight = baseHUDHeight * zoom;
  const clearance = 30;
  const offsetY = scaledHUDHeight + clearance;

  const showHUD = Boolean(selected || isAnchorHovered || isTooltipHovered);
  React.useEffect(() => {
    setIsAnchorHovered(isHovered);
  }, [isHovered]);

  const isSupportEdge = edgeType === "support";
  const isNegationEdge = edgeType === "negation";
  const activeEdgeLabel = isSupportEdge ? "Supports" : isNegationEdge ? "Negates" : null;
  const activeEdgeTone = isSupportEdge ? "text-emerald-600" : isNegationEdge ? "text-rose-600" : "text-stone-500";


  

  const [isSpacePressed, setIsSpacePressed] = React.useState(false);
  const panSessionRef = React.useRef<{
    pointerId: number;
    lastX: number;
    lastY: number;
    viewport: { x: number; y: number; zoom: number };
  } | null>(null);
  const pointerUpdateRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const stopPanSession = React.useCallback(() => {
    panSessionRef.current = null;
    // Cancel any pending RAF updates
    if (pointerUpdateRef.current !== null) {
      cancelAnimationFrame(pointerUpdateRef.current);
      pointerUpdateRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (pointerUpdateRef.current !== null) {
        cancelAnimationFrame(pointerUpdateRef.current);
      }
    };
  }, []);

  const handlePersistencePointerDown = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!reactFlow) {
      return;
    }

    const target = event.target as HTMLElement | null;
    const isMiddleButton = event.button === 1;
    const isTouchGesture = event.pointerType === 'touch';
    const isSpaceDrag = event.button === 0 && isSpacePressed;
    const isHandDrag = grabMode && event.button === 0 && event.pointerType === 'mouse';

    if (isHandDrag && target?.closest(INTERACTIVE_TARGET_SELECTOR)) {
      return;
    }

    if (!(isMiddleButton || isSpaceDrag || isTouchGesture || isHandDrag)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const viewport = reactFlow?.getViewport();
    if (!viewport) {
      return;
    }

    panSessionRef.current = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
      viewport,
    };

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch { }
  }, [grabMode, isSpacePressed, reactFlow]);

  const handlePersistencePointerMove = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const session = panSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();

    const deltaX = event.clientX - session.lastX;
    const deltaY = event.clientY - session.lastY;

    session.lastX = event.clientX;
    session.lastY = event.clientY;

    const nextViewport = {
      x: session.viewport.x + deltaX,
      y: session.viewport.y + deltaY,
      zoom: session.viewport.zoom,
    };

    session.viewport = nextViewport;

    // Cancel any pending update
    if (pointerUpdateRef.current !== null) {
      cancelAnimationFrame(pointerUpdateRef.current);
    }

    // Batch updates with RAF for smoother panning
    pointerUpdateRef.current = requestAnimationFrame(() => {
      reactFlow?.setViewport(nextViewport, { duration: 0 });
      pointerUpdateRef.current = null;
    });
  }, [reactFlow]);

  const handlePersistencePointerUp = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const session = panSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch { }

    stopPanSession();
  }, [stopPanSession]);

  const handlePersistencePointerLeave = React.useCallback(() => {
    stopPanSession();
  }, [stopPanSession]);

  const handlePortalMouseDown = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    event.stopPropagation();
  }, []);

  const handlePortalMouseMove = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.buttons & 1) === 0) {
      return;
    }

    event.stopPropagation();
  }, []);

  const handleConnectionAwareClick = React.useCallback((e: React.MouseEvent, normalAction: () => void) => {
    if (connectMode && onConnectionClick) {
      e.stopPropagation();
      onConnectionClick();
      return;
    }

    normalAction();
  }, [connectMode, onConnectionClick]);

  return (
    <React.Fragment>
      {/* 1) Small hover anchor stays in the edge-label layer */}
      <EdgeLabelRenderer>
        <div
          data-testid="edge-overlay-anchor"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${cx}px, ${cy}px)`,
            width: EDGE_ANCHOR_SIZE,
            height: EDGE_ANCHOR_SIZE,
            zIndex: 1,
            pointerEvents: connectMode ? 'none' : 'all',
          }}
          onMouseEnter={() => { onMouseEnter(); setIsAnchorHovered(true); }}
          onMouseLeave={() => { onMouseLeave(); setIsAnchorHovered(false); }}
        />
      </EdgeLabelRenderer>

      {/* 2) HUD is portaled to <body>, so it sits above nodes */}
      {portalTarget && showHUD && createPortal(
        // Outer: position at the anchor in screen-space, anchor X center / Y top
        <div
          style={{
            position: 'fixed',
            left: screenLeft,
            top: screenTop,
            transform: 'translateX(-50%)',
            zIndex: 60,
            pointerEvents: 'none',
          }}
          onMouseDown={handlePortalMouseDown}
          onMouseMove={handlePortalMouseMove}
        >
          <div
            style={{
              transform: `translateY(${offsetY}px)`,
              transformOrigin: 'center',
              pointerEvents: 'none',
            }}
          >
            {/* Persistence area - buffer only on the top to avoid blocking below */}
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'center',
                pointerEvents: 'auto',
                paddingTop: PERSISTENCE_PADDING,
                paddingBottom: 0,
                paddingLeft: 0,
                paddingRight: 0,
                marginTop: -PERSISTENCE_PADDING,
                marginBottom: 0,
                marginLeft: 0,
                marginRight: 0,
              }}
              onMouseEnter={() => setIsTooltipHovered(true)}
              onMouseLeave={() => {
                setIsTooltipHovered(false);
              }}
              onPointerDown={handlePersistencePointerDown}
              onPointerMove={handlePersistencePointerMove}
              onPointerUp={handlePersistencePointerUp}
              onPointerCancel={handlePersistencePointerUp}
              onPointerLeave={handlePersistencePointerLeave}
            >
              <div
                className="flex items-center justify-center gap-3 bg-white/95 backdrop-blur-sm border rounded-md shadow px-2 py-1 transition-opacity duration-300"
                style={{
                  pointerEvents: 'auto',
                }}
              >
                {(edgeType === "support" || edgeType === "negation") && onToggleEdgeType && (
                  <div className="flex items-center gap-3 text-[11px] select-none relative">
                    {activeEdgeLabel && (
                      <span className={`font-semibold ${activeEdgeTone}`}>{activeEdgeLabel}</span>
                    )}
                    <div
                      data-testid="toggle-edge-type"
                      className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm bg-stone-300"
                      onClick={(e) => handleConnectionAwareClick(e, () => onToggleEdgeType?.())}
                    >
                      <div className={`pointer-events-none flex items-center justify-center h-4 w-4 rounded-full bg-white shadow-lg transition-transform text-[9px] font-bold ${edgeType === "support" ? "translate-x-4 text-gray-600" : "translate-x-0 text-gray-600"}`}>
                        <div style={{ position: "relative", width: "12px", height: "12px" }}>
                          {edgeType === "support" ? (
                            <>
                              <div style={{ position: "absolute", left: "50%", top: "50%", width: "11px", height: "2px", backgroundColor: "#9CA3AF", transform: "translate(-50%, -50%) rotate(0deg)", borderRadius: "1px" }} />
                              <div style={{ position: "absolute", left: "50%", top: "50%", width: "11px", height: "2px", backgroundColor: "#9CA3AF", transform: "translate(-50%, -50%) rotate(90deg)", borderRadius: "1px" }} />
                            </>
                          ) : (
                            <div style={{ position: "absolute", left: "50%", top: "50%", width: "11px", height: "2px", backgroundColor: "#9CA3AF", transform: "translate(-50%, -50%) rotate(0deg)", borderRadius: "1px" }} />
                          )}
                        </div>
                      </div>
                    </div>
                    <TooltipProvider>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Tooltip key={`rel-${i}`}>
                            <TooltipTrigger asChild>
                              <button
                                title={`Set relevance to ${i}`}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={(e) => handleConnectionAwareClick(e, () => { e.stopPropagation(); onUpdateRelevance(i); })}
                              >
                                <span className={i <= relevance ? starColor : 'text-stone-300'}>
                                  {edgeType === "support" ? "+" : "-"}
                                </span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs !z-30">
                              Relevance: {i}/5
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </TooltipProvider>
                  </div>
                )}

                {(edgeType !== "support" && edgeType !== "negation") && (
                  <div className="flex items-center gap-2 text-[11px] select-none relative">
                    <span className="text-[11px] font-medium text-stone-600">Relevance:</span>
                    <TooltipProvider>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Tooltip key={`star-${i}`}>
                            <TooltipTrigger asChild>
                              <button
                                title={`Set relevance to ${i}`}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={(e) => handleConnectionAwareClick(e, () => { e.stopPropagation(); onUpdateRelevance(i); })}
                              >
                                <span className={`text-sm ${i <= relevance ? starColor : 'text-stone-300'}`}>★</span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs !z-30">
                              Relevance: {i}/5
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </TooltipProvider>
                  </div>
                )}

                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => handleConnectionAwareClick(e, () => { e.stopPropagation(); onAddObjection(); })}
                  className="rounded-full min-h-8 min-w-8 px-3 py-1 text-[11px] font-medium bg-stone-800 text-white relative z-0"
                  title="Add mitigation to this relation"
                >
                  Mitigate
                </button>
              </div>
            </div>
          </div>
        </div>,
        portalTarget
      )}
    </React.Fragment>
  );
};
