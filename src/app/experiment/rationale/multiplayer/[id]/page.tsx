'use client';

import React, { useMemo, useState } from 'react';
import { useAuthSetup } from '@/hooks/experiment/multiplayer/useAuthSetup';
import { useModeState } from '@/hooks/experiment/multiplayer/useModeState';
import { useBoardResolution } from '@/hooks/experiment/multiplayer/useBoardResolution';
import { BoardNotFound } from '@/components/experiment/multiplayer/BoardNotFound';
import { BoardLoading } from '@/components/experiment/multiplayer/BoardLoading';
import { MultiplayerBoardContent } from '@/components/experiment/multiplayer/MultiplayerBoardContent';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createAccessRequest } from '@/actions/experimental/rationaleAccess';
import { toast } from 'sonner';

export default function MultiplayerBoardDetailPage() {
  const { authenticated, privyReady, login, userId, username, userColor } = useAuthSetup();
  const authFingerprint = useMemo(
    () => (authenticated ? userId || "authenticated" : "anonymous"),
    [authenticated, userId]
  );
  const { routeParams, resolvedId, resolvedSlug, notFound, roomName, accessRole, forbidden, shareToken, ownerId } = useBoardResolution(authFingerprint);

  const {
    grabMode,
    setGrabMode,
    perfBoost,
    setPerfBoost,
    selectMode,
  } = useModeState();
  const [requestRole, setRequestRole] = useState<"viewer" | "editor">("viewer");
  const [requestPending, setRequestPending] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  if (notFound) {
    return <BoardNotFound />;
  }

  if (forbidden) {
    const showLoginCta = !authenticated;
    const requestDocId = typeof routeParams?.id === "string" ? routeParams.id : String(routeParams?.id || "");
    const handleRequestAccess = async () => {
      if (requestPending || !requestDocId) return;
      setRequestPending(true);
      try {
        const result = await createAccessRequest(requestDocId, requestRole);
        if (result?.status === "already_has_access") {
          toast.success("You already have access to this board.");
        } else {
          setRequestSent(true);
          toast.success("Access request sent.");
        }
      } catch (error: any) {
        toast.error(error?.message || "Failed to request access.");
      } finally {
        setRequestPending(false);
      }
    };
    return (
      <div className="fixed inset-0 top-16 bg-gray-50 flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white border rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-2">Access required</h2>
          <p className="text-sm text-stone-600 mb-4">
            You do not have access to this board. {showLoginCta ? 'Login to continue or request access from the owner.' : 'Request access from the owner to view this board.'}
          </p>
          {showLoginCta ? (
            <Button onClick={login as any} className="bg-sync hover:bg-sync-hover text-white">
              Login
            </Button>
          ) : (
            <div className="space-y-3">
              {requestSent ? (
                <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  Request sent. The owner can approve it from their boards page.
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Select
                    value={requestRole}
                    onValueChange={(value) => setRequestRole(value as "viewer" | "editor")}
                  >
                    <SelectTrigger className="h-9 sm:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Request view access</SelectItem>
                      <SelectItem value="editor">Request edit access</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleRequestAccess}
                    disabled={requestPending || !requestDocId}
                    className="bg-sync hover:bg-sync-hover text-white"
                  >
                    {requestPending ? "Sending..." : "Request access"}
                  </Button>
                </div>
              )}
            </div>
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
      ownerId={ownerId}
    />
  );
}
