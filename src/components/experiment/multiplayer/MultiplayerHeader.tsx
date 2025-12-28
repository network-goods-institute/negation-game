import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ConnectedUsers } from './ConnectedUsers';
import { WebsocketProvider } from 'y-websocket';
import { buildRationaleIndexPath } from '@/utils/hosts/syncPaths';
import { useSafeJson } from '@/hooks/network/useSafeJson';
import { logger } from "@/lib/logger";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { ShareBoardDialog } from './ShareBoardDialog';
import { DocAccessRole } from '@/services/mpAccess';

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
  onRetryConnection?: () => Promise<void>;
  debugShowAllStates?: boolean;
  accessRole?: DocAccessRole | null;
  slug?: string | null;
  onShareDialogChange?: (open: boolean) => void;
}

// DEBUG: Set to true to see all error states rendered at once
const DEBUG_SHOW_ALL_STATES = false;

// Helper function to get user-friendly error message
const getUserFriendlyErrorMessage = (
  connectionError: string | null,
  isConnected: boolean,
  connectionState?: 'initializing' | 'connecting' | 'connected' | 'failed'
): string => {
  if (connectionError) {
    if (connectionError.includes('AUTH_EXPIRED')) {
      return 'Your session expired. Please reload the page.';
    }
    if (connectionError.includes('WebSocket')) {
      return 'Connection lost. Your changes may not be saved.';
    }
    if (connectionError.includes('logged in')) {
      return 'You need to be logged in to collaborate.';
    }
    // Generic error fallback
    return 'Connection issue. Click retry to reconnect.';
  }

  if (!isConnected) {
    if (connectionState === 'connecting') {
      return 'Connecting to collaboration server...';
    }
    if (connectionState === 'failed') {
      return 'Unable to connect. Your changes may not be saved.';
    }
    return 'Not connected. Your changes may not be saved.';
  }

  return '';
};

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
  onRetryConnection,
  debugShowAllStates = DEBUG_SHOW_ALL_STATES,
  accessRole = null,
  slug = null,
  onShareDialogChange,
}) => {
  const { safeJson } = useSafeJson();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [localTitle, setLocalTitle] = useState(title || 'Untitled');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleSaving, setTitleSaving] = useState(false);
  const [titleCountdown, setTitleCountdown] = useState<number | null>(null);
  const [currentErrorIndex, setCurrentErrorIndex] = useState(0);
  const titleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const titleCountdownRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestTitleRef = useRef<string>(title || 'Untitled');
  const marketEnabled = process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED === 'true';
  const [pendingTrades, setPendingTrades] = useState(0);
  const [pendingLocal, setPendingLocal] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const canShare = accessRole === 'owner';

  useEffect(() => {
    onShareDialogChange?.(shareOpen);
  }, [shareOpen, onShareDialogChange]);

  useEffect(() => {
    if (!marketEnabled) return;
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
  }, [marketEnabled, documentId, provider]);

  useEffect(() => {
    if (!marketEnabled) return;
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
  }, [marketEnabled, provider]);

  useEffect(() => {
    if (!marketEnabled) return;
    try { (provider as any)?.awareness?.setLocalStateField?.('marketPending', pendingLocal); } catch { }
  }, [marketEnabled, provider, pendingLocal]);

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
      {!shareOpen && (
        <div className="absolute top-4 left-4 z-[60] bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-stone-200 w-80">
        {/* Header with Back button */}
        <div className="px-4 py-3 border-b border-stone-100">
          <div className="flex items-center justify-between">
            <Link
              href={buildRationaleIndexPath(typeof window !== 'undefined' ? window.location.host : null)}
              className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-700 transition-colors group w-fit"
            >
              <svg
                className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back</span>
            </Link>
            {canShare && documentId && (
              <button
                onClick={() => setShareOpen(true)}
                className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-700 transition-colors group w-fit"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span>Share</span>
              </button>
            )}
          </div>
        </div>

        {/* Title Section */}
        <div className="px-4 py-3 border-b border-stone-100">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-stone-600">Board Title</label>
            {titleEditingUser && (
              <div className="flex items-center gap-1.5 text-[10px] text-stone-500" style={{ color: titleEditingUser.color }}>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: titleEditingUser.color }} />
                <span className="truncate max-w-[100px]" title={`${titleEditingUser.name} editing`}>
                  {titleEditingUser.name}
                </span>
              </div>
            )}
            {!titleEditingUser && (titleSaving || titleCountdown !== null) && (
              <div className="flex items-center gap-1.5 text-[10px] text-blue-600">
                <div className={`w-2 h-2 rounded-full ${titleCountdown !== null ? 'animate-pulse bg-blue-600' : 'border border-blue-600 border-t-transparent animate-spin'}`} />
                <span>{titleCountdown !== null ? `${titleCountdown}s` : 'Saving'}</span>
              </div>
            )}
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
            className="w-full px-2.5 py-1.5 text-sm bg-white border border-stone-200 rounded-lg text-stone-700 hover:border-stone-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all placeholder:text-stone-400"
            placeholder="Untitled Board"
            disabled={!!titleEditingUser}
          />
        </div>
        {/* User Info & Status */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: userColor }} />
              <span className="text-xs text-stone-600">
                <span className="font-medium" style={{ color: userColor }}>{username}</span>
              </span>
            </div>

            {/* Subtle save indicator */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    if (!isSaving && forceSave) {
                      forceSave();
                    }
                  }}
                  disabled={isSaving || !forceSave || proxyMode || !isConnected}
                  className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-all disabled:cursor-default disabled:hover:bg-transparent group relative"
                >
                  {proxyMode ? (
                    <>
                      <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">Save:</span>
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      <span className="text-[10px] text-stone-400">read-only</span>
                    </>
                  ) : !isConnected ? (
                    <>
                      <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">Save:</span>
                      <div className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                      <span className="text-[10px] text-stone-400">offline</span>
                    </>
                  ) : isSaving ? (
                    <>
                      <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">Saving:</span>
                      <div className="h-2 w-2 rounded-full border border-stone-300 border-t-stone-500 animate-spin" />
                    </>
                  ) : timeLeft !== null ? (
                    <>
                      <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">Save:</span>
                      <div className="h-1.5 w-1.5 rounded-full bg-green-400 group-hover:scale-125 transition-transform" />
                      <span className="text-[10px] text-stone-400 tabular-nums">{formatTime(timeLeft)}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">Saved:</span>
                      <div className="h-1.5 w-1.5 rounded-full bg-green-400 group-hover:scale-125 transition-transform" />
                    </>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {proxyMode ? "Read-only mode" : !isConnected ? "Not connected" : isSaving ? "Saving..." : "Save now"}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Connected Users */}
          <ConnectedUsers
            provider={provider}
            isConnected={isConnected}
            currentUserId={userId}
            canWrite={!proxyMode}
          />

          {/* Carroll Mechanisms badge */}
          {marketEnabled && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 bg-purple-50 border border-purple-200 rounded-md text-xs text-purple-700 cursor-help">
                  <span className="font-semibold">Carroll Mechanisms</span>
                  <span className="px-1 py-0.5 bg-purple-200 text-purple-800 rounded text-[10px] font-bold">ALPHA</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="text-xs font-semibold mb-1">Initial Prototype</p>
                <p className="text-xs">Bugs are expected. Behavior and design may change without notice.</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Proxy Mode Warning */}
          {(proxyMode || debugShowAllStates) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg cursor-help">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-3.5 h-3.5 text-amber-600 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-[11px] text-amber-800 font-medium flex-1">Read-Only Mode</span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="text-xs">You&apos;re viewing changes from others but your edits won&apos;t sync to prevent conflicts. Reload the page if you believe you should be able to edit.</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Connection Error */}
          {((!isConnected || connectionError) || debugShowAllStates) && (() => {
            // Collect all active errors/states
            const collectActiveErrors = () => {
              const errors: Array<{ error: string | null; connected: boolean; state?: 'initializing' | 'connecting' | 'connected' | 'failed'; label: string }> = [];

              if (debugShowAllStates) {
                // Debug mode: show all possible scenarios
                return [
                  { error: null, connected: false, state: 'connecting' as const, label: 'Connecting' },
                  { error: null, connected: false, state: 'failed' as const, label: 'Connection Failed' },
                  { error: null, connected: false, state: undefined, label: 'Disconnected' },
                  { error: 'AUTH_EXPIRED', connected: false, state: 'failed' as const, label: 'Auth Expired' },
                  { error: 'WebSocket connection failed', connected: false, state: 'failed' as const, label: 'WebSocket Error' },
                  { error: 'You need to be logged in to load this document', connected: false, state: 'failed' as const, label: 'Login Required' },
                ];
              }

              // Normal mode: only add actual errors
              if (connectionError) {
                errors.push({ error: connectionError, connected: isConnected, state: connectionState, label: 'Connection Error' });
              }
              if (!isConnected && connectionState === 'connecting') {
                errors.push({ error: null, connected: false, state: 'connecting', label: 'Connecting' });
              }
              if (!isConnected && connectionState === 'failed' && !connectionError) {
                errors.push({ error: null, connected: false, state: 'failed', label: 'Connection Failed' });
              }
              if (!isConnected && !connectionState && !connectionError) {
                errors.push({ error: null, connected: false, state: undefined, label: 'Disconnected' });
              }

              return errors;
            };

            const activeErrors = collectActiveErrors();
            const hasMultipleErrors = activeErrors.length > 1;

            if (activeErrors.length === 0) {
              return null;
            }

            // Show carousel if multiple errors OR in debug mode
            if (hasMultipleErrors || debugShowAllStates) {
              const scenario = activeErrors[currentErrorIndex % activeErrors.length];
              const totalStates = activeErrors.length;
              const msg = getUserFriendlyErrorMessage(scenario.error, scenario.connected, scenario.state);
              const isAuth = scenario.error?.includes('AUTH_EXPIRED');

              return (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-medium text-stone-500">
                      {scenario.label} ({currentErrorIndex + 1}/{totalStates})
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentErrorIndex((prev) => (prev - 1 + totalStates) % totalStates)}
                        className="p-1 hover:bg-stone-100 rounded transition-colors"
                        title="Previous state"
                      >
                        <svg className="w-3 h-3 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setCurrentErrorIndex((prev) => (prev + 1) % totalStates)}
                        className="p-1 hover:bg-stone-100 rounded transition-colors"
                        title="Next state"
                      >
                        <svg className="w-3 h-3 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <svg className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="text-[11px] text-orange-800 flex-1 leading-snug" title={msg}>{msg}</span>
                      </div>
                      <button
                        onClick={async () => {
                          if (debugShowAllStates) {
                            // Debug mode - just log
                            if (isAuth) {
                              logger.log('Debug: Would reload page');
                            } else {
                              logger.log('Debug: Would retry connection');
                            }
                          } else {
                            // Real mode - actual actions
                            if (isAuth) {
                              window.location.reload();
                            } else {
                              try {
                                if (onRetryConnection) {
                                  await onRetryConnection();
                                } else {
                                  onResyncNow?.();
                                }
                              } catch (err) {
                                logger.error('Retry failed:', err);
                              }
                            }
                          }
                        }}
                        className="text-[10px] font-medium text-orange-700 hover:text-orange-900 px-2 py-1 bg-orange-100 hover:bg-orange-200 rounded transition-colors whitespace-nowrap"
                      >
                        {isAuth ? 'Reload' : 'Retry'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            // Single error - no carousel needed
            const singleError = activeErrors[0];
            const errorMessage = getUserFriendlyErrorMessage(singleError.error, singleError.connected, singleError.state);
            const isAuthExpired = singleError.error?.includes('AUTH_EXPIRED');

            return (
              <div className="mt-2 p-2.5 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <svg className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-[11px] text-orange-800 flex-1 leading-snug" title={errorMessage}>
                      {errorMessage}
                    </span>
                  </div>
                  <button
                    onClick={async () => {
                      if (isAuthExpired) {
                        window.location.reload();
                      } else {
                        try {
                          if (onRetryConnection) {
                            await onRetryConnection();
                          } else {
                            onResyncNow?.();
                          }
                        } catch (err) {
                          logger.error('Retry failed:', err);
                        }
                      }
                    }}
                    className="text-[10px] font-medium text-orange-700 hover:text-orange-900 px-2 py-1 bg-orange-100 hover:bg-orange-200 rounded transition-colors whitespace-nowrap"
                  >
                    {isAuthExpired ? 'Reload' : 'Retry'}
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
      )}
      {!shareOpen && marketEnabled && (
        <div className="absolute top-4 right-4 z-[60]">
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
      )}
      <ShareBoardDialog
        docId={documentId || ''}
        slug={slug || null}
        accessRole={accessRole}
        open={shareOpen}
        onOpenChange={setShareOpen}
        currentUserId={userId}
        currentUsername={username}
      />
    </>
  );
};
