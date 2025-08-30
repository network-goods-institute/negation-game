import React, { useState, useEffect } from 'react';
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
  forceSave?: () => Promise<void>;
  nextSaveTime?: number | null;
  proxyMode?: boolean;
  userId?: string;
  title?: string;
  onTitleCommit?: (title: string) => void;
  onTitleInput?: (title: string) => void;
}

export const MultiplayerHeader: React.FC<MultiplayerHeaderProps> = ({
  username,
  userColor,
  provider,
  isConnected,
  connectionError,
  isSaving,
  forceSave,
  nextSaveTime,
  proxyMode,
  userId,
  title,
  onTitleCommit,
  onTitleInput,
}) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [titleDraft, setTitleDraft] = useState('');

  useEffect(() => {
    if (typeof (title as any) === 'string') setTitleDraft(title as string);
  }, [title]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setTitleDraft(v);
    onTitleInput?.(v);
  };

  const handleTitleBlur = () => {
    onTitleCommit?.(titleDraft);
  };

  useEffect(() => {
    if (!nextSaveTime) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((nextSaveTime - now) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        setTimeLeft(null);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [nextSaveTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  return (
    <>
      <div className="absolute top-4 left-4 z-10 bg-white p-4 rounded-lg shadow-lg border">
        <div className="mb-2">
          <label className="block text-xs text-stone-600 mb-1">Title</label>
          <input
            value={titleDraft}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            placeholder="Enter title"
            className="w-full border rounded px-2 py-1 text-sm"
          />
        </div>
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
      <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
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
              <span className="text-xs text-stone-700">
                {isSaving ? 'Saving…' : (timeLeft !== null ? `Next save in ${formatTime(timeLeft)}` : 'Saved')}
              </span>
              {forceSave && !isSaving && (
                <button
                  onClick={() => forceSave()}
                  className="text-xs text-blue-600 hover:text-blue-800 border-l border-stone-200 pl-2 ml-1"
                  title="Force save now"
                >
                  Save now
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};
