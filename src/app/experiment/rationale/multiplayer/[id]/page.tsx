'use client';

import React, { useState, useEffect } from 'react';
import { AuthGate } from '@/components/auth/AuthGate';
import { isProductionEnvironment, isProductionRequest } from '@/utils/hosts';
import { useAuthSetup } from '@/hooks/experiment/multiplayer/useAuthSetup';
import { useModeState } from '@/hooks/experiment/multiplayer/useModeState';
import { useBoardResolution } from '@/hooks/experiment/multiplayer/useBoardResolution';
import { BoardNotFound } from '@/components/experiment/multiplayer/BoardNotFound';
import { BoardLoading } from '@/components/experiment/multiplayer/BoardLoading';
import { MultiplayerBoardContent } from '@/components/experiment/multiplayer/MultiplayerBoardContent';

export default function MultiplayerBoardDetailPage() {
  const { authenticated, privyReady, login, userId, username, userColor } = useAuthSetup();
  const { routeParams, resolvedId, notFound, roomName } = useBoardResolution();

  const {
    grabMode,
    setGrabMode,
    perfBoost,
    setPerfBoost,
    mindchangeSelectMode,
    setMindchangeSelectMode,
    mindchangeEdgeId,
    setMindchangeEdgeId,
    mindchangeNextDir,
    setMindchangeNextDir,
    selectMode,
  } = useModeState();

  const [requireAuth, setRequireAuth] = useState<boolean>(isProductionEnvironment());

  useEffect(() => {
    try {
      const host = typeof window !== 'undefined' ? window.location.hostname : '';
      setRequireAuth(isProductionRequest(host));
    } catch { }
  }, []);

  if (notFound) {
    return <BoardNotFound />;
  }

  if (privyReady && !authenticated && requireAuth) {
    return <AuthGate onLogin={login as any} />;
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
      mindchangeSelectMode={mindchangeSelectMode}
      setMindchangeSelectMode={setMindchangeSelectMode}
      mindchangeEdgeId={mindchangeEdgeId}
      setMindchangeEdgeId={setMindchangeEdgeId}
      mindchangeNextDir={mindchangeNextDir}
      setMindchangeNextDir={setMindchangeNextDir}
      selectMode={selectMode}
    />
  );
}
