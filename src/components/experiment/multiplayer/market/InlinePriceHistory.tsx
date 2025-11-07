"use client";
import React, { useEffect, useRef, useState } from 'react';
import { normalizeSecurityId } from '@/utils/market/marketUtils';

const PRICE_HISTORY_MEMCACHE = new Map<string, { updatedAt: number; data: PricePoint[] }>();
const CACHE_TTL_MS = 60000;
const POLL_INTERVAL_MS = 30000;

type PricePoint = {
  timestamp: string;
  price: number;
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
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [boxWidth, setBoxWidth] = useState<number>(0);

  useEffect(() => {
    let aborted = false;
    const key = `${docId}::${normalizeSecurityId(entityId)}`;

    const cached = PRICE_HISTORY_MEMCACHE.get(key);
    if (cached && Date.now() - cached.updatedAt < CACHE_TTL_MS) {
      setHistory(cached.data);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const fetchOnce = async () => {
      try {
        const res = await fetch(
          `/api/market/${encodeURIComponent(docId)}/price-history`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ securityId: normalizeSecurityId(entityId), limit: 10 }),
          }
        );
        if (!res.ok) {
          if (!aborted && !cached) setHistory([]);
          return;
        }
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        PRICE_HISTORY_MEMCACHE.set(key, { updatedAt: Date.now(), data: arr });
        if (!aborted) {
          setHistory(arr);
          setLoading(false);
        }
      } catch {
        if (!aborted && !cached) {
          setHistory([]);
          setLoading(false);
        }
      }
    };

    if (!cached || Date.now() - cached.updatedAt >= CACHE_TTL_MS) {
      fetchOnce();
    }

    const interval = window.setInterval(fetchOnce, POLL_INTERVAL_MS);
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
      window.clearInterval(interval);
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

  if (loading) {
    return (
      <div className={`w-full min-w-0 overflow-hidden ${className}`}>
        <div ref={boxRef} className="w-full min-w-0 pointer-events-none select-none overflow-hidden">
          <div className={`w-full min-w-0 box-border overflow-hidden rounded-md subpixel-antialiased ${compact ? '' : 'px-2 py-1.5'} ${compact ? '' : (variant === 'objection' ? 'bg-amber-50 border border-amber-200' : 'bg-white')}`}>
            <div className="h-[40px] w-full min-w-0 animate-pulse bg-emerald-50 rounded" />
          </div>
        </div>
      </div>
    );
  }

  const pricesRaw = history.length > 0 ? history.map((p) => p.price) : [currentPrice];
  const prices = pricesRaw.length === 1 ? [pricesRaw[0], pricesRaw[0]] : pricesRaw;
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  const height = 40;
  const padding = 3;
  const width = Math.max(0, Math.floor(boxWidth) - padding * 2);
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const denom = Math.max(1, prices.length - 1);
  const points = prices.map((price, i) => {
    const x = padding + (i / denom) * chartWidth;
    const y = padding + chartHeight - ((price - minPrice) / priceRange) * chartHeight;
    return { x, y };
  });

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');

  return (
    <div className={`w-full min-w-0 overflow-hidden ${className}`}>
      <div ref={boxRef} className="w-full min-w-0 pointer-events-none select-none overflow-hidden">
        <div className={`w-full min-w-0 box-border overflow-hidden rounded-md subpixel-antialiased font-sans ${compact ? '' : 'px-2 py-1.5'} ${compact ? '' : (variant === 'objection' ? 'bg-amber-50 border border-amber-200' : 'bg-white')}`}>
          <div className={`w-full min-w-0 overflow-hidden text-[14px] font-semibold ${compact ? 'mb-0.5' : 'mb-1'} ${variant === 'objection' ? 'text-amber-700' : 'text-emerald-700'}`}>{(currentPrice * 100).toFixed(1)}% chance</div>
          <svg width="100%" height={height} className="block w-full min-w-0" preserveAspectRatio="none">
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
            {points.length > 0 && (
              <circle
                cx={points[points.length - 1].x}
                cy={points[points.length - 1].y}
                r="2"
                fill={variant === 'objection' ? "rgb(245, 158, 11)" : "rgb(16, 185, 129)"}
              />
            )}
          </svg>
        </div>
      </div>
    </div>
  );
};
