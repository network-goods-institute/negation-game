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
}

export const MultiplayerHeader: React.FC<MultiplayerHeaderProps> = ({
  username,
  userColor,
  provider,
  isConnected,
  connectionError,
  isSaving,
  proxyMode,
}) => {
  return (
    <>
      <div className="absolute top-4 left-4 z-10 bg-white p-4 rounded-lg shadow-lg border">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Multiplayer Rationale</h1>
        <p className="text-sm text-gray-600">
          You are: <span className="font-semibold" style={{ color: userColor }}>{username}</span>
        </p>
        {proxyMode && (
          <div className="mt-1 inline-flex items-center gap-2 text-xs px-2 py-1 bg-stone-100 text-stone-700 rounded">
            <span className="h-2 w-2 rounded-full bg-stone-400" /> Proxy mode — changes won’t sync
          </div>
        )}
        <ConnectedUsers provider={provider} isConnected={isConnected} />
        {connectionError && (
          <p className="text-xs text-orange-600 mt-1 bg-orange-50 p-2 rounded">{connectionError}</p>
        )}
      </div>
      <div className="absolute top-4 right-4 z-10">
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur rounded-full border px-3 py-1 shadow-sm">
          {isSaving ? (
            <div className="h-3 w-3 rounded-full border-2 border-stone-300 border-t-stone-600 animate-spin" />
          ) : (
            <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
          )}
          <span className="text-xs text-stone-700">{isSaving ? 'Saving…' : 'Saved'}</span>
        </div>
      </div>
    </>
  );
};