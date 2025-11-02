import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { buildRationaleDetailPath } from '@/utils/hosts/syncPaths';import { logger } from "@/lib/logger";

export const useBoardResolution = () => {
  const routeParams = useParams<{ id: string }>();
  const router = useRouter();
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [resolvedSlug, setResolvedSlug] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const raw = typeof routeParams?.id === 'string' ? routeParams.id : String(routeParams?.id || '');
    if (!raw) return;

    // Reset state at the start of a new lookup to avoid sticky not-found and stale data
    setNotFound(false);
    setResolvedId(null);
    setResolvedSlug(null);

    (async () => {
      try {
        const res = await fetch(`/api/experimental/rationales/${encodeURIComponent(raw)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.id) {
            setNotFound(false);
            setResolvedId(data.id);
            setResolvedSlug(data.slug || null);
            try {
              const host = typeof window !== 'undefined' ? window.location.host : '';
              const canonical = buildRationaleDetailPath(data.id, host, data.slug || undefined);
              const current = typeof window !== 'undefined' ? window.location.pathname : '';
              if (canonical && current && canonical !== current) {
                router.replace(canonical);
              }
            } catch { }
          } else {
            logger.error('[Slug Resolution] API returned invalid data:', data);
            setResolvedId(raw);
          }
        } else if (res.status === 404) {
          logger.error('[Slug Resolution] Document not found:', raw);
          setNotFound(true);
          setResolvedId(null);
          setResolvedSlug(null);
        } else {
          logger.error('[Slug Resolution] API request failed:', res.status, res.statusText);
          setResolvedId(raw);
          setNotFound(false);
        }
      } catch (err) {
        logger.error('[Slug Resolution] Failed to resolve slug:', err);
        setResolvedId(raw);
        setNotFound(false);
      }
    })();
  }, [routeParams?.id, router]);

  const roomName = useMemo(() => {
    const idPart = resolvedId || '';
    return `rationale:${idPart}`;
  }, [resolvedId]);

  return {
    routeParams,
    resolvedId,
    resolvedSlug,
    notFound,
    roomName,
  };
};
