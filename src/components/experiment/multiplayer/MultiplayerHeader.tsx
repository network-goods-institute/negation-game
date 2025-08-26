import React from 'react';
import { ConnectedUsers } from './ConnectedUsers';
import { WebsocketProvider } from 'y-websocket';

type YProvider = WebsocketProvider | null;

interface MultiplayerHeaderProps {
  username: string;
  userColor: string;
  provider: YProvider;
  isConnected: boolean;
  connectionError: string | null;
  isSaving: boolean;
  proxyMode?: boolean;
  userId?: string;
}

export const MultiplayerHeader: React.FC<MultiplayerHeaderProps> = ({
  username,
  userColor,
  provider,
  isConnected,
  connectionError,
  isSaving,
  proxyMode,
  userId,
}) => {
  return (
    <>
      <div className="absolute top-4 left-4 z-10 bg-white p-4 rounded-lg shadow-lg border">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Multiplayer Rationale</h1>
        <p className="text-sm text-gray-600">
          You are: <span className="font-semibold" style={{ color: userColor }}>{username}</span>
        </p>
        {proxyMode && (
          <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-800 mb-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Read-Only Mode
            </div>
            <p className="text-xs text-amber-700">
              You&apos;re viewing changes from others but your edits won&apos;t sync to prevent conflicts. 
              If you believe you should be able to edit, reload the window.
            </p>
          </div>
        )}
        <ConnectedUsers 
          provider={provider} 
          isConnected={isConnected} 
          currentUserId={userId}
          isLeader={!proxyMode}
        />
        {connectionError && (
          <p className="text-xs text-orange-600 mt-1 bg-orange-50 p-2 rounded">{connectionError}</p>
        )}
      </div>
      <div className="absolute top-4 right-4 z-10">
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur rounded-full border px-3 py-1 shadow-sm">
          {proxyMode ? (
            <>
              <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="text-xs text-amber-700">No changes persist</span>
            </>
          ) : (
            <>
              {isSaving ? (
                <div className="h-3 w-3 rounded-full border-2 border-stone-300 border-t-stone-600 animate-spin" />
              ) : (
                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
              )}
              <span className="text-xs text-stone-700">{isSaving ? 'Saving…' : 'Saved'}</span>
            </>
          )}
        </div>
      </div>
    </>
  );
};