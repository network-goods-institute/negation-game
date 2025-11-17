"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useReactFlow } from '@xyflow/react';
import { PriceHeader } from './PriceHeader';
import { ActionButtons } from './ActionButtons';
import { ChartSection } from './ChartSection';
import { PositionInfo } from './PositionInfo';
import { TradeControls } from './TradeControls';
import { BuySellButtons } from './BuySellButtons';
import { normalizeSecurityId, dispatchMarketRefresh } from '@/utils/market/marketUtils';
import { useBuyAmountPreview } from '@/hooks/market/useBuyAmountPreview';
import { buyAmount } from '@/utils/market/marketContextMenu';
import { toast } from 'sonner';

type Props = {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  docId: string | null;
  onClose: () => void;
  onExpanded?: (expanded: boolean) => void;
};

export const MarketPanel: React.FC<Props> = ({ selectedNodeId, selectedEdgeId, docId, onClose, onExpanded }) => {
  const rf = useReactFlow();
  const [expanded, setExpanded] = useState(false);
  const [amount, setAmount] = useState<number>(50);
  const [submitting, setSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [cachedEntity, setCachedEntity] = useState<any>(null);
  const [cachedTitle, setCachedTitle] = useState<string>('');
  const [cachedMarketData, setCachedMarketData] = useState<any>({});
  const [isSwitching, setIsSwitching] = useState(false);
  const [prevEntityId, setPrevEntityId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleClose = useCallback(() => {
    if (isClosing) return; // Prevent double-closing

    setIsClosing(true);

    // Let parent handle selection clearing; we just play the animation then signal close
    setTimeout(() => {
      onClose();
    }, 250);
  }, [onClose, isClosing]);

  // Determine which entity is selected
  const entityId = selectedNodeId || selectedEdgeId;
  const entityType = selectedNodeId ? 'node' : selectedEdgeId ? 'edge' : null;

  // Get entity data
  const entity = useMemo(() => {
    if (!entityId) return null;
    if (entityType === 'node') {
      return rf.getNode(entityId);
    } else if (entityType === 'edge') {
      return rf.getEdge(entityId);
    }
    return null;
  }, [entityId, entityType, rf]);

  // Extract market data (memoized so effects don't see a new object every render)
  const marketData = useMemo(
    () => (entity?.data?.market || {} as any),
    [entity]
  );
  const price = Number(marketData.price) || 0;
  const mine = Number(marketData.mine) || 0;
  const total = Number(marketData.total) || 0;

  // Get title
  const title = useMemo(() => {
    if (!entity) return cachedTitle;
    if (entityType === 'node') {
      return (entity as any).data?.content || 'Untitled';
    } else if (entityType === 'edge') {
      const sourceNode = rf.getNode((entity as any).source);
      const targetNode = rf.getNode((entity as any).target);
      const sourceContent = (sourceNode as any)?.data?.content || 'Node';
      const targetContent = (targetNode as any)?.data?.content || 'Node';
      return `${sourceContent} ↔ ${targetContent}`;
    }
    return cachedTitle;
  }, [entity, entityType, rf, cachedTitle]);

  // Cache entity data for closing animation
  useEffect(() => {
    if (entity) {
      setCachedEntity(entity);
      setCachedTitle(title);
      setCachedMarketData(marketData);
    }
  }, [entity, title, marketData]);

  // Notify parent about expanded state changes
  useEffect(() => {
    onExpanded?.(expanded);
  }, [expanded, onExpanded]);

  // Detect entity switching and trigger animation
  useEffect(() => {
    const currentEntityId = selectedNodeId || selectedEdgeId;

    if (prevEntityId && currentEntityId && prevEntityId !== currentEntityId) {
      // Entity changed - trigger switch animation
      // Reset trade input to default to avoid carrying invalid values
      setAmount(50);
      setIsSwitching(true);
      setTimeout(() => {
        setIsSwitching(false);
      }, 250);
    }
    
    setPrevEntityId(currentEntityId);
  }, [selectedNodeId, selectedEdgeId, prevEntityId]);

  // Close when entity is deselected (but not during controlled closing animation)
  useEffect(() => {
    if (!entityId && !isClosing) {
      handleClose();
    }
  }, [entityId, isClosing, handleClose]);

  // Track if this is the initial mount for opening animation
  const [isInitialMount, setIsInitialMount] = useState(true);
  
  useEffect(() => {
    // After a short delay, mark as no longer initial mount
    const timer = setTimeout(() => {
      setIsInitialMount(false);
    }, 350);
    return () => clearTimeout(timer);
  }, []);

  const handleExpand = useCallback(() => {
    if (expanded) return;
    setIsInitialMount(false);
    setExpanded(true);
  }, [expanded]);

  const handleCollapse = useCallback(() => {
    if (!expanded) return;
    setIsInitialMount(false);
    setExpanded(false);
  }, [expanded]);

  const normEntityId = useMemo(() => (entityId ? normalizeSecurityId(entityId) : null), [entityId]);
  const preview = useBuyAmountPreview(docId, normEntityId, amount);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const handleExternalClose = () => { handleClose(); };
    window.addEventListener('market:panelClose', handleExternalClose as any);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('market:panelClose', handleExternalClose as any);
    };
  }, [handleClose]);

  const handleTrade = async (tradeAmount: number) => {
    if (!entityId || submitting) return;

    setSubmitting(true);
    try {
      const normId = normalizeSecurityId(entityId);
      toast.info('Order placed ✅');
      const result = await buyAmount(normId, tradeAmount);
      const success = result !== false;
      if (success) {
        toast.success('Order complete 🎉');
        setAmount(50); // Reset
      } else {
        toast.error('Order failed');
      }
    } catch (e: any) {
      toast.error(String(e?.message || 'Order failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = () => {
    if (!entityId) return;
    const url = `${window.location.origin}${window.location.pathname}?${entityType}=${entityId}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied! Share this market 📋');
  };

  const handleRefresh = useCallback(async () => {
    const start = Date.now();
    setRefreshing(true);
    try {
      if (docId) {
        await fetch(`/api/market/${encodeURIComponent(docId)}/view?bypassCache=1`, { cache: 'no-store' }).catch(() => null);
      }
    } catch {}
    try { dispatchMarketRefresh(); } catch {}
    finally {
      const elapsed = Date.now() - start;
      const min = 500;
      const wait = elapsed < min ? min - elapsed : 0;
      setTimeout(() => setRefreshing(false), wait);
    }
  }, [docId]);

  const displayEntity: any = entity || cachedEntity;
  const displayEntityId: string | null = entityId || (cachedEntity as any)?.id || prevEntityId;
  if (!displayEntity && !isClosing) return null;

  // Use hybrid approach - instant width change, smooth transform animation
  const getPanelClasses = () => {
    // Very high z-index; actual stacking is controlled by portal (body-level)
    const baseClasses = 'fixed z-[2000] bg-gradient-to-br from-white to-stone-50/30 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-stone-200/60 overflow-hidden backdrop-blur-xl market-panel-base';
    
    let classes = baseClasses;
    
    if (isClosing) {
      classes += ' closing';
    }
    
    if (expanded) {
      classes += ' market-panel-expanded-width expanded';
    } else {
      classes += ' market-panel-normal';
    }
    
    return classes;
  };

  // Animation logic for open/close only (NOT expand/collapse)
  const getAnimationStyle = () => {
    if (isClosing) {
      return { animation: 'panelFadeOut 220ms ease-out forwards' };
    }
    if (isInitialMount) {
      return { animation: 'slideInRight 300ms ease-out forwards' };
    }
    return {};
  };

  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  if (!portalTarget) return null;

  const panel = (
    <>
      {/* Backdrop when expanded */}
      {expanded && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[1500]"
          style={isClosing ? { animation: 'backdropFadeOut 200ms ease-out forwards' } : { animation: 'backdropFadeIn 200ms ease-out forwards' }}
          onClick={handleClose}
        />
      )}

      {/* Animations */}
      <style>{`
        @keyframes slideInRight {
          from { 
            transform: translate(100vw, 80px);
            opacity: 0;
          }
          to { 
            transform: translate(calc(100vw - 360px - 24px), 80px);
            opacity: 1;
          }
        }
        @keyframes slideOutRight { to { transform: translateX(100vw) !important; opacity: 0; } }
        @keyframes panelFadeOut { to { opacity: 0; } }
        @keyframes backdropFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes backdropFadeOut { to { opacity: 0; } }
        @keyframes contentSwitchOut {
          to {
            opacity: 0;
            transform: translateX(-20px);
          }
        }
        @keyframes contentSwitchIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .market-panel-base {
          top: 0;
          left: 0;
          transition: transform 400ms cubic-bezier(0.16, 1, 0.3, 1);
          will-change: transform, opacity;
        }
        .market-panel-base.closing {
          transition: none !important;
        }
        .market-panel-normal {
          width: 360px;
          transform: translate(calc(100vw - 360px - 24px), 80px);
        }
        .market-panel-expanded-width {
          width: 600px;
        }
        .market-panel-base.expanded {
          transform: translate(calc(50vw - 300px), 50vh) translateY(-50%);
        }
      `}</style>

      {/* Panel */}
      <div
        className={getPanelClasses()}
        style={getAnimationStyle()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-stone-200/60 bg-white/60 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-0.5">
                Market
              </h2>
              <div 
                className="text-sm font-semibold text-stone-900 line-clamp-1 leading-tight"
                style={isSwitching ? { animation: 'contentSwitchIn 250ms ease-out' } : {}}
              >
                {title}
              </div>
            </div>
            <ActionButtons
              expanded={expanded}
              onExpand={() => expanded ? handleCollapse() : handleExpand()}
              onShare={handleShare}
              onClose={handleClose}
              onRefresh={handleRefresh}
              refreshing={refreshing}
            />
          </div>
        </div>

        {/* Content */}
        <div 
          className="p-4 space-y-4"
          style={isSwitching ? { animation: 'contentSwitchIn 250ms ease-out' } : {}}
        >
          {/* Price */}
          {displayEntityId && (
            <PriceHeader key={displayEntityId} price={price} entityId={displayEntityId} docId={docId} />
          )}

          {/* Chart */}
          {displayEntityId && (
            <ChartSection entityId={displayEntityId} docId={docId} price={price} />
          )}

          {/* Position info (if user has shares) */}
          {displayEntityId && mine > 0 && (
            <PositionInfo
              price={price}
              mine={mine}
              total={total}
              entityId={displayEntityId}
              docId={docId}
            />
          )}

          {/* Trade controls */}
          <TradeControls
            amount={amount}
            setAmount={setAmount}
            mine={mine}
            disabled={submitting}
          />

          {/* Buy/Sell buttons */}
          <BuySellButtons
            amount={amount}
            price={price}
            mine={mine}
            onTrade={handleTrade}
            disabled={submitting}
            estimatedShares={preview.shares ?? null}
            loadingShares={preview.loading}
          />
        </div>
      </div>
    </>
  );

  return createPortal(panel, portalTarget);
};
