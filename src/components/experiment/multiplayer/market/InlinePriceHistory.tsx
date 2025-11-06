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
};

/**
 * Inline, friendly price history display for nodes
 * Rounder and simpler than the tooltip version
 */
export const InlinePriceHistory: React.FC<Props> = ({
  entityId,
  docId,
  currentPrice,
  className = ''
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
      try { PRICE_HISTORY_MEMCACHE.delete(key); } catch {}
      fetchOnce();
    };
    window.addEventListener('market:refresh', onRefresh as any);
    return () => {
      aborted = true;
      window.clearInterval(interval);
      window.removeEventListener('market:refresh', onRefresh as any);
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
    try { ro.observe(el); } catch {}
    return () => { try { ro.disconnect(); } catch {} };
  }, []);

  if (loading) {
    return (
      <div className={`${className}`}>
        <div ref={boxRef} className="w-full max-w-full min-w-0 pointer-events-none select-none">
          <div className="w-full max-w-full box-border overflow-hidden rounded-md border border-gray-200 bg-white/95 backdrop-blur-sm shadow-sm px-2 py-1.5">
            <div className="h-[40px] w-full animate-pulse bg-emerald-50 rounded" />
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
    <div className={`${className}`}>
      <div ref={boxRef} className="w-full max-w-full min-w-0 pointer-events-none select-none">
        <div className="w-full max-w-full box-border overflow-hidden rounded-md border border-gray-200 bg-white/95 backdrop-blur-sm shadow-sm px-2 py-1.5">
          <div className="text-[11px] font-semibold text-emerald-700 mb-1">{(currentPrice * 100).toFixed(1)}%</div>
          <svg width="100%" height={height} className="block w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id={`gradient-${entityId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity="0.05" />
              </linearGradient>
            </defs>
            <path
              d={`${pathData} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`}
              fill={`url(#gradient-${entityId})`}
            />
            <path
              d={pathData}
              fill="none"
              stroke="rgb(16, 185, 129)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.length > 0 && (
              <circle
                cx={points[points.length - 1].x}
                cy={points[points.length - 1].y}
                r="2"
                fill="rgb(16, 185, 129)"
              />
            )}
          </svg>
        </div>
      </div>
    </div>
  );
};
