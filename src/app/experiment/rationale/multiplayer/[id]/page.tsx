'use client';

import React, { useMemo, useEffect, useRef } from 'react';
import { useAuthSetup } from '@/hooks/experiment/multiplayer/useAuthSetup';
import { useModeState } from '@/hooks/experiment/multiplayer/useModeState';
import { useBoardResolution } from '@/hooks/experiment/multiplayer/useBoardResolution';
import { BoardNotFound } from '@/components/experiment/multiplayer/BoardNotFound';
import { BoardLoading } from '@/components/experiment/multiplayer/BoardLoading';
import { MultiplayerBoardContent } from '@/components/experiment/multiplayer/MultiplayerBoardContent';
import {
  trackMpBoardAccessDenied,
  trackMpBoardViewed,
} from '@/lib/analytics/trackers';

export default function MultiplayerBoardDetailPage() {
  const { authenticated, privyReady, login, userId, username, userColor } = useAuthSetup();
  const authFingerprint = useMemo(
    () => (authenticated ? userId || "authenticated" : "anonymous"),
    [authenticated, userId]
  );
  const { routeParams, resolvedId, resolvedSlug, notFound, roomName, accessRole, requiresAuth, forbidden, shareToken } = useBoardResolution(authFingerprint);

  const {
    grabMode,
    setGrabMode,
    perfBoost,
    setPerfBoost,
    selectMode,
  } = useModeState();
  const lastViewedIdRef = useRef<string | null>(null);
  const lastDeniedIdRef = useRef<string | null>(null);

  useEffect(() => {
    const boardId = resolvedId || routeParams?.id || null;
    if (!forbidden || !boardId || lastDeniedIdRef.current === boardId) return;
    lastDeniedIdRef.current = boardId;
    trackMpBoardAccessDenied({
      boardId,
      requiresAuth,
      authenticated,
    });
  }, [forbidden, requiresAuth, authenticated, resolvedId, routeParams?.id]);

  useEffect(() => {
    if (!privyReady || !resolvedId || forbidden || notFound) return;
    if (lastViewedIdRef.current === resolvedId) return;
    lastViewedIdRef.current = resolvedId;
    trackMpBoardViewed({
      boardId: resolvedId,
      accessRole,
      resolvedSlug,
      shareToken,
    });
  }, [privyReady, resolvedId, forbidden, notFound, accessRole, resolvedSlug, shareToken]);

  if (notFound) {
    return <BoardNotFound />;
  }

  if (forbidden) {
    const showLoginCta = requiresAuth && !authenticated;
    return (
      <div className="fixed inset-0 top-16 bg-gray-50 flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white border rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-2">Access required</h2>
          <p className="text-sm text-stone-600 mb-4">
            You do not have access to this board. {showLoginCta ? 'Login to continue or request access from the owner.' : 'Request access from the owner to view this board.'}
          </p>
          {showLoginCta && (
            <button
              onClick={login as any}
              className="inline-flex items-center justify-center rounded-md bg-sync px-3 py-2 text-sm font-medium text-white hover:bg-sync-hover transition-colors"
            >
              Login
            </button>
          )}
        </div>
      </div>
    );
  }


  if (!privyReady || !resolvedId) {
    return <BoardLoading />;
  }

  return (
    <MultiplayerBoardContent
      authenticated={authenticated}
      userId={userId}
      username={username}
      userColor={userColor}
      roomName={roomName}
      resolvedId={resolvedId}
      routeParams={routeParams}
      grabMode={grabMode}
      setGrabMode={setGrabMode}
      perfBoost={perfBoost}
      setPerfBoost={setPerfBoost}
      selectMode={selectMode}
      accessRole={accessRole}
      shareToken={shareToken}
      resolvedSlug={resolvedSlug}
    />
  );
}

