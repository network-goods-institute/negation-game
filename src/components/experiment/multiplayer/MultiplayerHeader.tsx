import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ConnectedUsers } from './ConnectedUsers';
import { WebsocketProvider } from 'y-websocket';
import { buildRationaleIndexPath } from '@/utils/hosts/syncPaths';
import { useSafeJson } from '@/hooks/network/useSafeJson'; import { logger } from "@/lib/logger";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  const { safeJson } = useSafeJson();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [localTitle, setLocalTitle] = useState(title || 'Untitled');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleSaving, setTitleSaving] = useState(false);
  const [titleCountdown, setTitleCountdown] = useState<number | null>(null);
  const titleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const titleCountdownRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestTitleRef = useRef<string>(title || 'Untitled');
  const [pendingTrades, setPendingTrades] = useState(0);
  const [pendingLocal, setPendingLocal] = useState(0);

  useEffect(() => {
    const bumpLocal = (delta: number) => {
      setPendingLocal((p) => Math.max(0, p + delta));
    };
    const onStart = (e: any) => {
      try {
        const d = (e as CustomEvent)?.detail || {};
        bumpLocal(1);
      } catch { }
    };
    const onFinish = (e: any) => {
      try {
        const d = (e as CustomEvent)?.detail || {};
        bumpLocal(-1);
      } catch { }
    };
    try { window.addEventListener('market:tradeStarted', onStart as any); } catch { }
    try { window.addEventListener('market:tradeFinished', onFinish as any); } catch { }
    return () => {
      try { window.removeEventListener('market:tradeStarted', onStart as any); } catch { }
      try { window.removeEventListener('market:tradeFinished', onFinish as any); } catch { }
    };
  }, [documentId, provider]);

  useEffect(() => {
    let disposed = false;
    const recompute = () => {
      try {
        const aw = (provider as any)?.awareness;
        if (!aw) return;
        const states = Array.from(aw.getStates?.().values?.() || []);
        let sum = 0;
        for (const st of states) {
          const v = Number((st as any)?.marketPending ?? 0);
          if (Number.isFinite(v) && v > 0) sum += v;
        }
        if (!disposed) setPendingTrades(sum);
      } catch { }
    };
    recompute();
    try {
      const aw = (provider as any)?.awareness;
      if (aw) {
        const onChange = () => recompute();
        aw.on?.('change', onChange);
        return () => { disposed = true; aw.off?.('change', onChange); };
      }
    } catch { }
    return () => { disposed = true; };
  }, [provider]);

  useEffect(() => {
    try { (provider as any)?.awareness?.setLocalStateField?.('marketPending', pendingLocal); } catch { }
  }, [provider, pendingLocal]);

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
                const data: any = await safeJson(response);
                onTitleChange(latestTitleRef.current.trim());
                // Update URL if slug changed
                if (data?.slug && data?.id && onUrlUpdate) {
                  onUrlUpdate(data.id, data.slug);
                }
              } else {
                logger.error('Failed to save title');
              }
            } catch (error) {
              logger.error('Error saving title:', error);
            }
          }
          setTitleSaving(false);
          onTitleSavingStop?.();
          titleTimeoutRef.current = null;
        }, 1000);
      }
    };

    runCountdown(5);
  }, [documentId, onTitleChange, onTitleCountdownStart, onTitleCountdownStop, onTitleSavingStart, onTitleSavingStop, onUrlUpdate, safeJson]);

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
        <div className="mt-3 pt-3 border-t border-stone-200">
          <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-50 border border-purple-200 rounded-md text-xs text-purple-700 group relative">
            <span className="font-semibold">Carroll Mechanisms</span>
            <span className="px-1 py-0.5 bg-purple-200 text-purple-800 rounded text-[10px] font-bold">ALPHA</span>
            <div className="absolute left-0 top-full mt-1 w-72 p-2 bg-gray-900 text-white text-xs rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
              <p className="font-semibold mb-1">Initial Prototype</p>
              <p>Bugs are to be expected. Behavior and design may change drastically and without warning.</p>
            </div>
          </div>
        </div>
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
        <div className="flex items-end justify-end">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`group relative flex items-center gap-2 bg-white/90 backdrop-blur rounded-full border px-3 py-1.5 shadow-sm hover:shadow-md transition-all cursor-help ${pendingTrades > 0
                    ? 'border-blue-200'
                    : 'border-stone-200'
                    }`}
                  aria-label="Pending trades"
                  aria-live="polite"
                  role="status"
                >
                  <div className="relative flex items-center justify-center">
                    <svg
                      className={`w-3.5 h-3.5 ${pendingTrades > 0
                        ? 'text-blue-500 animate-pulse'
                        : 'text-stone-400'
                        }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                      />
                    </svg>
                  </div>
                  <span className={`text-xs font-medium relative inline-flex items-center ${pendingTrades > 0
                    ? 'text-blue-700'
                    : 'text-stone-600'
                    }`}>
                    <span
                      key={pendingTrades}
                      className="inline-block animate-fade-in-scale"
                    >
                      {pendingTrades}
                    </span>
                    <span className="ml-1">{pendingTrades === 1 ? 'trade' : 'trades'}</span>
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" align="end" alignOffset={-90} className="bg-white border-stone-200 shadow-lg px-4 py-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 pb-2 border-b border-stone-200">
                    <svg
                      className={`w-4 h-4 ${pendingTrades > 0 ? 'text-blue-500' : 'text-stone-400'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                      />
                    </svg>
                    <span className="font-semibold text-sm text-stone-900">
                      {pendingTrades > 0 ? 'Active Trades' : 'No Active Trades'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    <div className="text-stone-500 text-xs">Total:</div>
                    <div className="text-stone-900 font-semibold text-xs text-right tabular-nums">{pendingTrades}</div>
                    <div className="text-stone-500 text-xs">Yours:</div>
                    <div className="text-blue-600 font-semibold text-xs text-right tabular-nums">{pendingLocal}</div>
                    <div className="text-stone-500 text-xs">Others:</div>
                    <div className="text-purple-600 font-semibold text-xs text-right tabular-nums">{Math.max(0, pendingTrades - pendingLocal)}</div>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div >
    </>
  );
};
