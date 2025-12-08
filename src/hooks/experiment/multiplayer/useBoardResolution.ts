import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { buildRationaleDetailPath } from '@/utils/hosts/syncPaths';
import { logger } from "@/lib/logger";

export const useBoardResolution = (authFingerprint?: string | null) => {
  const routeParams = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const shareParam = searchParams?.get?.("share") || null;
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [resolvedSlug, setResolvedSlug] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [accessRole, setAccessRole] = useState<"owner" | "editor" | "viewer" | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(shareParam);
  const authKey = authFingerprint ?? null;

  useEffect(() => {
    setShareToken(shareParam);
  }, [shareParam]);

  useEffect(() => {
    const raw = typeof routeParams?.id === 'string' ? routeParams.id : String(routeParams?.id || '');
    if (!raw) return;

    setNotFound(false);
    setResolvedId(null);
    setResolvedSlug(null);
    setAccessRole(null);
    setRequiresAuth(false);
    setForbidden(false);

    (async () => {
      try {
        const qs = shareToken ? `?share=${encodeURIComponent(shareToken)}` : "";
        const res = await fetch(`/api/experimental/rationales/${encodeURIComponent(raw)}${qs}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.id) {
            setNotFound(false);
            setResolvedId(data.id);
            setResolvedSlug(data.slug || null);
            setAccessRole(data.role || null);
            setRequiresAuth(false);
            setForbidden(false);
            try {
              const host = typeof window !== 'undefined' ? window.location.host : '';
              const canonical = buildRationaleDetailPath(data.id, host, data.slug || undefined);
              const current = typeof window !== 'undefined' ? window.location.pathname : '';
              if (canonical && current && canonical !== current) {
                const search =
                  typeof window !== 'undefined'
                    ? new URLSearchParams(window.location.search || '')
                    : new URLSearchParams();
                const tokenForRedirect = shareToken || shareParam || null;
                if (tokenForRedirect) {
                  search.set('share', tokenForRedirect);
                }
                const searchStr = search.toString();
                const hash =
                  typeof window !== 'undefined' ? window.location.hash || '' : '';
                const nextUrl = `${canonical}${searchStr ? `?${searchStr}` : ''}${hash}`;
                router.replace(nextUrl);
              }
            } catch { }
          } else {
            logger.error('[Slug Resolution] API returned invalid data:', data);
            setResolvedId(raw);
          }
        } else if (res.status === 403) {
          setForbidden(true);
          const payload = await res.json().catch(() => ({}));
          setRequiresAuth(Boolean(payload?.requiresAuth));
          setResolvedId(null);
          setResolvedSlug(null);
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
  }, [routeParams?.id, router, shareToken, authKey, shareParam]);

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
    accessRole,
    requiresAuth,
    forbidden,
    shareToken,
  };
};
