"use client";
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { normalizeSecurityId } from '@/utils/market/marketUtils';

const PRICE_HISTORY_MEMCACHE = new Map<string, { updatedAt: number; data: PricePoint[] }>();
const CACHE_TTL_MS = 60000;
const POLL_INTERVAL_MS = Number(process.env.NEXT_PUBLIC_MARKET_POLL_INTERVAL_MS || 20000);

type PricePoint = {
  timestamp: string;
  price: number;
  deltaScaled?: string;
  costScaled?: string;
};

type Props = {
  entityId: string;
  docId: string;
  currentPrice: number;
  className?: string;
  variant?: 'default' | 'objection';
  compact?: boolean; // When true, removes padding and background (for embedding in other containers)
};

/**
 * Inline, friendly price history display for nodes
 * Rounder and simpler than the tooltip version
 */
export const InlinePriceHistory: React.FC<Props> = ({
  entityId,
  docId,
  currentPrice,
  className = '',
  variant = 'default',
  compact = false
}) => {
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [boxWidth, setBoxWidth] = useState<number>(0);
  const [tooltipData, setTooltipData] = useState<{
    x: number;
    y: number;
    screenX: number;
    screenY: number;
    price: number;
    timestamp: string;
    deltaScaled?: string;
    costScaled?: string;
  } | null>(null);

  useEffect(() => {
    let aborted = false;
    let intervalId: number | null = null;
    const key = `${docId}::${normalizeSecurityId(entityId)}`;

    const cached = PRICE_HISTORY_MEMCACHE.get(key);
    if (cached && Date.now() - cached.updatedAt < CACHE_TTL_MS) {
      setHistory(cached.data);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const fetchOnce = async () => {
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }

      try {
        const res = await fetch(
          `/api/market/${encodeURIComponent(docId)}/price-history`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ securityId: normalizeSecurityId(entityId), limit: 50 }),
          }
        );
        if (!res.ok) {
          if (!aborted && !cached) {
            setHistory([]);
            setError(true);
            setLoading(false);
          }
          return;
        }
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        PRICE_HISTORY_MEMCACHE.set(key, { updatedAt: Date.now(), data: arr });
        if (!aborted) {
          setHistory(arr);
          setError(false);
          setLoading(false);
        }
      } catch {
        if (!aborted && !cached) {
          setHistory([]);
          setError(true);
          setLoading(false);
        }
      }
    };

    if (!cached || Date.now() - cached.updatedAt >= CACHE_TTL_MS) {
      fetchOnce();
    }

    const startPolling = () => {
      if (intervalId === null) {
        intervalId = window.setInterval(fetchOnce, POLL_INTERVAL_MS);
      }
    };

    const stopPolling = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        // Resume polling and fetch immediately when tab becomes visible
        fetchOnce();
        startPolling();
      }
    };

    if (typeof document === 'undefined' || !document.hidden) {
      startPolling();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    const onRefresh = () => {
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      try { PRICE_HISTORY_MEMCACHE.delete(key); } catch { }
      fetchOnce();
    };
    const onOptimistic = (e: any) => {
      try {
        const sid = String(e?.detail?.securityId || '');
        if (sid === normalizeSecurityId(entityId)) {
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          try { PRICE_HISTORY_MEMCACHE.delete(key); } catch { }
          fetchOnce();
        }
      } catch { }
    };
    window.addEventListener('market:refresh', onRefresh as any);
    window.addEventListener('market:optimisticTrade', onOptimistic as any);
    return () => {
      aborted = true;
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('market:refresh', onRefresh as any);
      window.removeEventListener('market:optimisticTrade', onOptimistic as any);
    };
  }, [entityId, docId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cw = Math.floor(entry.contentRect.width);
        if (Number.isFinite(cw) && cw >= 0) setBoxWidth(cw);
      }
    });
    try { ro.observe(el); } catch { }
    return () => { try { ro.disconnect(); } catch { } };
  }, []);

  if (error && history.length === 0 && !loading) {
    return null;
  }

  if (loading) {
    return (
      <div className={`w-full min-w-0 overflow-hidden ${className}`}>
        <div ref={boxRef} className="w-full min-w-0 pointer-events-none select-none overflow-hidden">
          <div className={`w-full min-w-0 box-border overflow-hidden rounded-md subpixel-antialiased font-sans ${compact ? '' : 'px-2 py-1.5'} ${compact ? '' : (variant === 'objection' ? 'bg-amber-50 border border-amber-200' : 'bg-white')}`}>
            <div className={`text-[14px] font-semibold ${compact ? 'mb-0.5' : 'mb-1'} ${variant === 'objection' ? 'text-amber-700' : 'text-emerald-600'}`}>
              {(currentPrice * 100).toFixed(1)}% chance
            </div>
            <div className="h-[40px] w-full animate-pulse bg-stone-200/50 rounded relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" style={{ animationDuration: '1.5s' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const displaySeries: PricePoint[] = (() => {
    const series = Array.isArray(history) ? [...history] : [];
    try {
      const last = series[series.length - 1];
      const lastPrice = Number(last?.price);
      if (!Number.isFinite(lastPrice) || Math.abs(lastPrice - Number(currentPrice)) > 1e-9) {
        series.push({ timestamp: new Date().toISOString(), price: Number(currentPrice) });
      }
    } catch {
      series.push({ timestamp: new Date().toISOString(), price: Number(currentPrice) });
    }
    if (series.length === 1) {
      const only = series[0];
      let dupTs = new Date().toISOString();
      try {
        const t = Date.parse(only.timestamp);
        if (Number.isFinite(t)) dupTs = new Date(t + 1000).toISOString();
      } catch { }
      series.push({ timestamp: dupTs, price: only.price });
    }
    return series;
  })();

  const prices = displaySeries.length > 0 ? displaySeries.map((p) => p.price) : [currentPrice];
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  const height = 40;
  const padding = 8;
  const width = Math.max(0, Math.floor(boxWidth));
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const times = displaySeries.map((p) => {
    const t = Date.parse(p.timestamp);
    return Number.isFinite(t) ? t : NaN;
  });
  const hasValidTimes = times.some((t) => Number.isFinite(t));
  let points: Array<{ x: number; y: number }> = [];
  if (hasValidTimes) {
    const validPairs = displaySeries.map((p, i) => ({ t: times[i], price: prices[i] }))
      .filter((v) => Number.isFinite(v.t));
    const tMin = Math.min(...validPairs.map((v) => v.t as number));
    const tMax = Math.max(...validPairs.map((v) => v.t as number));
    const tRange = Math.max(1, tMax - tMin);
    points = validPairs.map(({ t, price }) => {
      const x = padding + ((t - tMin) / tRange) * chartWidth;
      const y = padding + chartHeight - ((price - minPrice) / priceRange) * chartHeight;
      return { x, y };
    });
  } else {
    const denom = Math.max(1, prices.length - 1);
    points = prices.map((price, i) => {
      const x = padding + (i / denom) * chartWidth;
      const y = padding + chartHeight - ((price - minPrice) / priceRange) * chartHeight;
      return { x, y };
    });
  }

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || points.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let closestIndex = 0;
    let minDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const dx = points[i].x - mouseX;
      const dy = points[i].y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        closestIndex = i;
      }
    }

    const dataPoint = displaySeries[closestIndex];
    if (dataPoint) {
      // Calculate screen position for tooltip
      const screenX = rect.left + points[closestIndex].x;
      const screenY = rect.top + points[closestIndex].y;

      setTooltipData({
        x: points[closestIndex].x,
        y: points[closestIndex].y,
        screenX,
        screenY,
        price: dataPoint.price,
        timestamp: dataPoint.timestamp,
        deltaScaled: dataPoint.deltaScaled,
        costScaled: dataPoint.costScaled,
      });
    }
  };

  const handleMouseLeave = () => {
    setTooltipData(null);
  };

  const formatTimestamp = (ts: string) => {
    try {
      const date = new Date(ts);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) return `${days}d ago`;
      if (hours > 0) return `${hours}h ago`;
      if (minutes > 0) return `${minutes}m ago`;
      return 'just now';
    } catch {
      return '';
    }
  };

  const getSecurityType = () => {
    const normalized = normalizeSecurityId(entityId);
    // Check if it looks like a node (p-, s-, c-, group- prefixes)
    if (/^(p-|s-|c-|group-)/.test(normalized)) return 'node';
    // Otherwise assume it's an edge
    return 'edge';
  };

  const formatTradeInfo = (deltaScaled?: string, costScaled?: string) => {
    if (!deltaScaled || !costScaled) return null;

    try {
      const delta = BigInt(deltaScaled);
      const cost = BigInt(costScaled);
      const isBuy = delta > 0n;

      const deltaNum = Math.abs(Number(delta) / 1e18);
      const costNum = Math.abs(Number(cost) / 1e18);

      // Format numbers nicely
      const formatNum = (n: number) => {
        if (n >= 1000) return n.toFixed(0);
        if (n >= 100) return n.toFixed(1);
        if (n >= 1) return n.toFixed(2);
        return n.toFixed(3);
      };

      return {
        action: isBuy ? 'Bought' : 'Sold',
        shares: formatNum(deltaNum),
        cost: formatNum(costNum),
      };
    } catch {
      return null;
    }
  };

  return (
    <div className={`w-full min-w-0 overflow-hidden ${className}`}>
      <div ref={boxRef} className="w-full min-w-0 select-none overflow-hidden" style={{ pointerEvents: 'auto' }}>
        <div className={`w-full min-w-0 box-border overflow-hidden rounded-md subpixel-antialiased font-sans ${compact ? '' : 'px-2 py-1.5'} ${compact ? '' : (variant === 'objection' ? 'bg-amber-50 border border-amber-200' : 'bg-white')}`}>
          <div className={`w-full min-w-0 overflow-hidden text-[14px] font-semibold ${compact ? 'mb-0.5' : 'mb-1'} ${variant === 'objection' ? 'text-amber-700' : 'text-emerald-600'}`}>{(currentPrice * 100).toFixed(1)}% chance</div>
          <div className="relative">
            <svg
              ref={svgRef}
              width="100%"
              height={height}
              viewBox={`0 0 ${width} ${height}`}
              className="block w-full min-w-0 cursor-crosshair"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
            <defs>
              <linearGradient id={`gradient-${entityId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={variant === 'objection' ? "rgb(245, 158, 11)" : "rgb(16, 185, 129)"} stopOpacity="0.2" />
                <stop offset="100%" stopColor={variant === 'objection' ? "rgb(245, 158, 11)" : "rgb(16, 185, 129)"} stopOpacity="0.05" />
              </linearGradient>
            </defs>
            <path
              d={`${pathData} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`}
              fill={`url(#gradient-${entityId})`}
            />
            <path
              d={pathData}
              fill="none"
              stroke={variant === 'objection' ? "rgb(245, 158, 11)" : "rgb(16, 185, 129)"}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.length > 0 && !tooltipData && (
              <>
                <circle
                  cx={points[points.length - 1].x}
                  cy={points[points.length - 1].y}
                  r="6"
                  fill={variant === 'objection' ? "rgba(245, 158, 11, 0.15)" : "rgba(16, 185, 129, 0.15)"}
                />
                <circle
                  cx={points[points.length - 1].x}
                  cy={points[points.length - 1].y}
                  r="4"
                  fill="white"
                  stroke={variant === 'objection' ? "rgb(245, 158, 11)" : "rgb(16, 185, 129)"}
                  strokeWidth="2"
                />
              </>
            )}
            {tooltipData && (
              <>
                <line
                  x1={tooltipData.x}
                  y1="0"
                  x2={tooltipData.x}
                  y2={height}
                  stroke={variant === 'objection' ? "rgba(245, 158, 11, 0.3)" : "rgba(16, 185, 129, 0.3)"}
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
                <circle
                  cx={tooltipData.x}
                  cy={tooltipData.y}
                  r="7"
                  fill={variant === 'objection' ? "rgba(245, 158, 11, 0.2)" : "rgba(16, 185, 129, 0.2)"}
                  stroke="none"
                />
                <circle
                  cx={tooltipData.x}
                  cy={tooltipData.y}
                  r="5"
                  fill="white"
                  stroke={variant === 'objection' ? "rgb(245, 158, 11)" : "rgb(16, 185, 129)"}
                  strokeWidth="2.5"
                />
              </>
            )}
          </svg>
          </div>
        </div>
      </div>
      {tooltipData && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed z-[9999] px-2 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded shadow-lg pointer-events-none"
          style={{
            left: `${tooltipData.screenX}px`,
            top: `${tooltipData.screenY}px`,
            transform: 'translate(-50%, -100%) translateY(-8px)',
          }}
        >
          <div className="font-semibold text-gray-900">{(tooltipData.price * 100).toFixed(1)}%</div>
          <div className="text-gray-500 text-[10px] mb-1">{formatTimestamp(tooltipData.timestamp)}</div>
          {(() => {
            const tradeInfo = formatTradeInfo(tooltipData.deltaScaled, tooltipData.costScaled);
            const securityType = getSecurityType();
            if (!tradeInfo) {
              return (
                <div className="text-[10px] border-t border-gray-200 pt-1">
                  <div className="text-gray-500 italic">
                    Price updated
                  </div>
                  <div className="text-gray-400 text-[9px]">
                    (no trade on this {securityType})
                  </div>
                </div>
              );
            }
            return (
              <div className="text-[10px] border-t border-gray-200 pt-1 space-y-0.5">
                <div className={tradeInfo.action === 'Bought' ? 'text-green-600' : 'text-red-600'}>
                  {tradeInfo.action} {tradeInfo.shares} shares
                </div>
                <div className="text-gray-600">
                  for ${tradeInfo.cost}
                </div>
                <div className="text-gray-400 text-[9px] italic">
                  (trade on this {securityType})
                </div>
              </div>
            );
          })()}
        </div>,
        document.body
      )}
    </div>
  );
};
