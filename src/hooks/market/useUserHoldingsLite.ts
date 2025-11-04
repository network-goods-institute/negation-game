"use client";
import React from "react";

export function useUserHoldingsLite(docId: string | null | undefined, refreshMs: number = 5000) {
  const [data, setData] = React.useState<Record<string, string> | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const optimisticRef = React.useRef<Record<string, string>>({});
  const lastServerBaseRef = React.useRef<Record<string, string>>({});
  const inFlightRef = React.useRef<boolean>(false);
  const lastFetchRef = React.useRef<number>(0);
  const MIN_COOLDOWN_MS = 1500;

  const fetchOnce = React.useCallback(async () => {
    if (!docId) return;
    const now = Date.now();
    if (inFlightRef.current) return;
    if (now - lastFetchRef.current < MIN_COOLDOWN_MS) return;
    inFlightRef.current = true;
    try {
      setLoading(true);
      const res = await fetch(`/api/market/${encodeURIComponent(String(docId))}/holdings`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      const base: Record<string, string> = json?.holdings || {};
      const pending = optimisticRef.current || {};
      const lastBase = lastServerBaseRef.current || {};
      const keys = new Set<string>([...Object.keys(base), ...Object.keys(pending), ...Object.keys(lastBase)]);
      const newPending: Record<string, string> = {};
      for (const k of keys) {
        try {
          const p = BigInt(pending[k] ?? '0');
          const prev = BigInt(lastBase[k] ?? '0');
          const cur = BigInt(base[k] ?? '0');
          const serverDelta = cur - prev;
          if (p > 0n && serverDelta > 0n) {
            const applied = serverDelta > p ? p : serverDelta;
            const remainder = p - applied;
            if (remainder !== 0n) newPending[k] = remainder.toString();
          } else if (p < 0n && serverDelta < 0n) {
            const absP = -p;
            const absD = -serverDelta;
            const applied = absD > absP ? absP : absD;
            const remainder = p + applied;
            if (remainder !== 0n) newPending[k] = remainder.toString();
          } else {
            if (p !== 0n) newPending[k] = p.toString();
          }
        } catch {
          if (pending[k] && pending[k] !== '0') newPending[k] = pending[k];
        }
      }
      const merged: Record<string, string> = { ...base };
      for (const [k, v] of Object.entries(newPending)) {
        try {
          merged[k] = (BigInt(base[k] ?? '0') + BigInt(v ?? '0')).toString();
        } catch {
          merged[k] = base[k] ?? v;
        }
      }
      setData(merged);
      optimisticRef.current = newPending;
      lastServerBaseRef.current = base;
      setError(null);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      lastFetchRef.current = Date.now();
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [docId]);

  React.useEffect(() => {
    optimisticRef.current = {};
    lastServerBaseRef.current = {};
    lastFetchRef.current = 0;
    inFlightRef.current = false;
    setData(null);
    setError(null);
    setLoading(false);
  }, [docId]);

  React.useEffect(() => {
    let timer: any;
    if (!docId) return;
    fetchOnce();
    timer = setInterval(fetchOnce, refreshMs);
    const kick = () => { fetchOnce(); };
    const optimistic = (e: any) => {
      try {
        const detail = (e as CustomEvent)?.detail || {};
        const evDoc = String(detail.docId || '');
        const sec = String(detail.securityId || '');
        const delta = String(detail.deltaScaled || '0');
        if (!sec || delta === '0') return;
        if (docId && evDoc && evDoc !== docId) return;
        const local = optimisticRef.current[sec] ? String(optimisticRef.current[sec]) : '0';
        const nextLocal = (BigInt(local) + BigInt(delta)).toString();
        optimisticRef.current = { ...optimisticRef.current, [sec]: nextLocal };
        setData((prev) => {
          const base = prev && prev[sec] ? String(prev[sec]) : '0';
          const next = (BigInt(base) + BigInt(delta)).toString();
          return { ...(prev || {}), [sec]: next };
        });
      } catch {}
    };
    try { window.addEventListener('market:refresh', kick); } catch {}
    try { window.addEventListener('market:optimisticTrade', optimistic as any); } catch {}
    return () => {
      try { clearInterval(timer); } catch {}
      try { window.removeEventListener('market:refresh', kick); } catch {}
      try { window.removeEventListener('market:optimisticTrade', optimistic as any); } catch {}
    };
  }, [docId, fetchOnce, refreshMs]);

  return { data, loading, error, refetch: fetchOnce };
}
