import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ConnectedUsers } from './ConnectedUsers';
import { WebsocketProvider } from 'y-websocket';
import { buildRationaleIndexPath } from '@/utils/hosts/syncPaths';

type YProvider = WebsocketProvider | null;

interface MultiplayerHeaderProps {
  username: string;
  userColor: string;
  provider: YProvider;
  isConnected: boolean;
  connectionError: string | null;
  connectionState?: 'initializing' | 'connecting' | 'connected' | 'failed';
  isSaving: boolean;
  forceSave?: () => Promise<void>;
  interruptSave?: () => void;
  nextSaveTime?: number | null;
  proxyMode?: boolean;
  userId?: string;
  title?: string;
  documentId?: string;
  onTitleChange?: (newTitle: string) => void;
}

export const MultiplayerHeader: React.FC<MultiplayerHeaderProps> = ({
  username,
  userColor,
  provider,
  isConnected,
  connectionError,
  isSaving,
  forceSave,
  interruptSave,
  nextSaveTime,
  proxyMode,
  userId,
  title,
  connectionState,
  documentId,
  onTitleChange,
}) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [localTitle, setLocalTitle] = useState(title || 'Untitled');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleSaving, setTitleSaving] = useState(false);
  const titleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalTitle(title || 'Untitled');
  }, [title]);

  useEffect(() => {
    if (titleTimeoutRef.current) {
      clearTimeout(titleTimeoutRef.current);
    }

    if (localTitle !== (title || 'Untitled') && !isEditingTitle && localTitle.trim()) {
      setTitleSaving(true);
      titleTimeoutRef.current = setTimeout(async () => {
        if (documentId && onTitleChange) {
          try {
            const response = await fetch(`/api/experimental/rationales/${encodeURIComponent(documentId)}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: localTitle.trim() }),
            });

            if (response.ok) {
              onTitleChange(localTitle.trim());
            } else {
              console.error('Failed to save title');
            }
          } catch (error) {
            console.error('Error saving title:', error);
          }
        }
        setTitleSaving(false);
        titleTimeoutRef.current = null;
      }, 5000);
    } else if (!isEditingTitle && localTitle !== (title || 'Untitled') && !localTitle.trim()) {
      setLocalTitle(title || 'Untitled');
      setTitleSaving(false);
    } else {
      setTitleSaving(false);
    }

    return () => {
      if (titleTimeoutRef.current) {
        clearTimeout(titleTimeoutRef.current);
        titleTimeoutRef.current = null;
      }
    };
  }, [localTitle, title, isEditingTitle, documentId, onTitleChange]);

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
        <Link
          href={buildRationaleIndexPath(typeof window !== 'undefined' ? window.location.host : null)}
          className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-800 transition-colors mb-3 group"
        >
          <svg
            className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Boards</span>
        </Link>
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs text-stone-600">Board Title</label>
            {titleSaving && (
              <div className="flex items-center gap-1 text-xs text-blue-600">
                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </div>
            )}
          </div>
          <input
            type="text"
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            spellCheck={true}
            onFocus={() => setIsEditingTitle(true)}
            onBlur={() => setIsEditingTitle(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="w-full px-2 py-1 text-sm bg-white border border-stone-300 rounded text-gray-700 hover:border-stone-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
            placeholder="Untitled"
            disabled={proxyMode}
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
          canWrite={!proxyMode}
        />
        {(connectionError || connectionState === 'connecting' || connectionState === 'failed') && (
          <p className="text-xs text-orange-600 mt-1 bg-orange-50 p-2 rounded">
            {connectionError || (connectionState === 'connecting' ? 'Connecting to server...' : connectionState === 'failed' ? 'Connection failed' : null)}
          </p>
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
              {isSaving && interruptSave && (
                <button
                  onClick={() => interruptSave()}
                  className="text-xs text-red-600 hover:text-red-800 border-l border-stone-200 pl-2 ml-1"
                  title="Stop saving"
                >
                  Stop
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};