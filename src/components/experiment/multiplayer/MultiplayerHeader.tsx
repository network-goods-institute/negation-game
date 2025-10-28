import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  onTitleEditingStart?: () => void;
  onTitleEditingStop?: () => void;
  onTitleCountdownStart?: () => void;
  onTitleCountdownStop?: () => void;
  onTitleSavingStart?: () => void;
  onTitleSavingStop?: () => void;
  onUrlUpdate?: (id: string, slug: string) => void;
  titleEditingUser?: { name: string; color: string } | null;
  onResyncNow?: () => void;
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
  onTitleEditingStart,
  onTitleEditingStop,
  onTitleCountdownStart,
  onTitleCountdownStop,
  onTitleSavingStart,
  onTitleSavingStop,
  onUrlUpdate,
  titleEditingUser,
  onResyncNow,
}) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [localTitle, setLocalTitle] = useState(title || 'Untitled');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleSaving, setTitleSaving] = useState(false);
  const [titleCountdown, setTitleCountdown] = useState<number | null>(null);
  const titleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const titleCountdownRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestTitleRef = useRef<string>(title || 'Untitled');

  useEffect(() => {
    setLocalTitle(title || 'Untitled');
  }, [title]);

  useEffect(() => {
    latestTitleRef.current = localTitle;
  }, [localTitle]);

  const startCountdownSequence = useCallback(async () => {
    if (titleCountdownRef.current) {
      clearTimeout(titleCountdownRef.current);
    }
    if (titleTimeoutRef.current) {
      clearTimeout(titleTimeoutRef.current);
    }

    const runCountdown = (count: number) => {
      setTitleCountdown(count);
      if (count === 5) {
        // Starting countdown
        onTitleCountdownStart?.();
      }

      if (count > 1) {
        titleCountdownRef.current = setTimeout(() => runCountdown(count - 1), 1000);
      } else {
        // Final countdown reached, now save
        titleTimeoutRef.current = setTimeout(async () => {
          onTitleCountdownStop?.();
          setTitleSaving(true);
          setTitleCountdown(null);
          onTitleSavingStart?.();

          if (documentId && onTitleChange) {
            try {
              const response = await fetch(`/api/experimental/rationales/${encodeURIComponent(documentId)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: latestTitleRef.current.trim() }),
              });

              if (response.ok) {
                const data = await response.json();
                onTitleChange(latestTitleRef.current.trim());
                // Update URL if slug changed
                if (data?.slug && data?.id && onUrlUpdate) {
                  onUrlUpdate(data.id, data.slug);
                }
              } else {
                console.error('Failed to save title');
              }
            } catch (error) {
              console.error('Error saving title:', error);
            }
          }
          setTitleSaving(false);
          onTitleSavingStop?.();
          titleTimeoutRef.current = null;
        }, 1000);
      }
    };

    runCountdown(5);
  }, [documentId, onTitleChange, onTitleCountdownStart, onTitleCountdownStop, onTitleSavingStart, onTitleSavingStop, onUrlUpdate]);

  const handleTitleChange = useCallback((newTitle: string) => {
    setLocalTitle(newTitle);

    // Clear existing timers
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (titleCountdownRef.current) {
      clearTimeout(titleCountdownRef.current);
    }
    if (titleTimeoutRef.current) {
      clearTimeout(titleTimeoutRef.current);
    }

    setTitleCountdown(null);
    setTitleSaving(false);

    // Stop countdown awareness if we were in countdown
    if (titleCountdown !== null) {
      onTitleCountdownStop?.();
    }

    // Only start countdown if title has changed and has content
    if (newTitle && newTitle !== (title || 'Untitled')) {
      typingTimeoutRef.current = setTimeout(() => {
        startCountdownSequence();
      }, 1500); // Wait 1.5 seconds after typing stops
    }
  }, [title, startCountdownSequence, onTitleCountdownStop, titleCountdown]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (titleCountdownRef.current) {
        clearTimeout(titleCountdownRef.current);
      }
      if (titleTimeoutRef.current) {
        clearTimeout(titleTimeoutRef.current);
      }
    };
  }, []);

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
          <div className="flex items-start justify-between mb-1 gap-2">
            <label className="block text-xs text-stone-600 flex-shrink-0">Board Title</label>
            {titleEditingUser ? (
              <div className="flex items-center gap-1 text-xs flex-shrink-0 max-w-[140px]" style={{ color: titleEditingUser.color }}>
                <div className="w-3 h-3 rounded-full animate-pulse flex-shrink-0" style={{ backgroundColor: titleEditingUser.color }} />
                <span className="truncate" title={`${titleEditingUser.name} is editing...`}>
                  {titleEditingUser.name} is editing...
                </span>
              </div>
            ) : (titleSaving || titleCountdown !== null) ? (
              <div className="flex items-center gap-1 text-xs text-blue-600 flex-shrink-0">
                {titleCountdown !== null ? (
                  <>
                    <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse flex-shrink-0" />
                    <span className="whitespace-nowrap">Saving in {titleCountdown}...</span>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    <span className="whitespace-nowrap">Saving...</span>
                  </>
                )}
              </div>
            ) : null}
          </div>
          <input
            type="text"
            value={localTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            spellCheck={true}
            onFocus={() => {
              setIsEditingTitle(true);
              onTitleEditingStart?.();
            }}
            onBlur={() => {
              setIsEditingTitle(false);
              onTitleEditingStop?.();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="w-full px-2 py-1 text-sm bg-white border border-stone-300 rounded text-gray-700 hover:border-stone-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
            placeholder="Untitled"
            disabled={!!titleEditingUser}
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
        {(!isConnected || connectionError || connectionState === 'connecting' || connectionState === 'failed') && (
          <div className="text-xs mt-1 p-2 rounded flex items-center justify-between gap-2"
            style={{ backgroundColor: '#fff7ed', color: '#9a3412' }}>
            <span>
              {connectionError || (!isConnected ? (connectionState === 'connecting' ? 'Connecting to server...' : connectionState === 'failed' ? 'Connection failed' : 'Not Connected') : null)}
            </span>
            <div className="flex items-center gap-2">
              {connectionError?.includes('AUTH_EXPIRED') ? (
                <button
                  onClick={() => window.location.reload()}
                  className="text-xs text-white px-2 py-1 rounded transition-colors whitespace-nowrap"
                  style={{ backgroundColor: '#ea580c' }}
                >
                  Reload Auth
                </button>
              ) : (
                <button
                  onClick={() => {
                    try { onResyncNow?.(); } catch { }
                    try { provider?.connect(); } catch { }
                  }}
                  className="text-xs text-white px-2 py-1 rounded transition-colors whitespace-nowrap"
                  style={{ backgroundColor: '#ea580c' }}
                >
                  Retry
                </button>
              )}
            </div>
          </div>
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
              {!isConnected ? (
                <>
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  <span className="text-xs text-stone-700">Not Connected — changes won&apos;t be saved</span>
                  <button
                    onClick={() => {
                      try { onResyncNow?.(); } catch { }
                      try { provider?.connect(); } catch { }
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 border-l border-stone-200 pl-2 ml-1"
                    title="Retry connect"
                  >
                    Retry
                  </button>
                </>
              ) : isSaving ? (
                <div className="h-3 w-3 rounded-full border-2 border-stone-300 border-t-stone-600 animate-spin" />
              ) : (
                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
              )}
              <span className="text-xs text-stone-700">
                {isSaving ? 'Saving…' : (!isConnected ? '' : (timeLeft !== null ? `Next save in ${formatTime(timeLeft)}` : 'Saved'))}
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