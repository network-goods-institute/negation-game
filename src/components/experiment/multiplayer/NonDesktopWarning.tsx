'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isNonDesktopExperience } from '@/utils/experiment/multiplayer/deviceDetection';

const STORAGE_KEY = 'ng:mp-mobile-warning-dismissed';

interface NonDesktopWarningProps {
  fallbackPath?: string;
}

export const NonDesktopWarning: React.FC<NonDesktopWarningProps> = ({
  fallbackPath = '/',
}) => {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const frameRef = useRef<number | null>(null);
  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  const updateState = useCallback(() => {
    const detected = isNonDesktopExperience();
    setOpen(detected && !dismissed);
  }, [dismissed]);

  const handleContinue = useCallback(() => {
    setOpen(false);
    setDismissed(true);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, 'true');
      } catch { }
    }
  }, []);

  const handleLeave = useCallback(() => {
    setOpen(false);
    if (typeof window === 'undefined') return;
    try {
      if (window.history.length > 1) {
        window.history.back();
        return;
      }
    } catch { }
    try {
      window.location.href = fallbackPath;
    } catch { }
  }, [fallbackPath]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let stored = false;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY) === 'true';
    } catch { }
    setDismissed(stored);
    if (!stored && isNonDesktopExperience()) {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const nextDismissed = event.newValue === 'true';
      setDismissed(nextDismissed);
      if (nextDismissed) {
        setOpen(false);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mqPointer = window.matchMedia?.('(pointer: coarse)');
    const mqHover = window.matchMedia?.('(hover: none)');

    const scheduleUpdate = () => {
      if (frameRef.current != null) return;
      if (typeof window.requestAnimationFrame !== 'function') {
        updateState();
        return;
      }
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        updateState();
      });
    };

    updateState();
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('orientationchange', scheduleUpdate);
    mqPointer?.addEventListener?.('change', scheduleUpdate);
    mqHover?.addEventListener?.('change', scheduleUpdate);

    return () => {
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('orientationchange', scheduleUpdate);
      mqPointer?.removeEventListener?.('change', scheduleUpdate);
      mqHover?.removeEventListener?.('change', scheduleUpdate);
      if (frameRef.current != null) {
        if (typeof window.cancelAnimationFrame === 'function') {
          window.cancelAnimationFrame(frameRef.current);
        }
        frameRef.current = null;
      }
    };
  }, [updateState]);

  if (!open || !portalTarget) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="non-desktop-warning-title"
      aria-describedby="non-desktop-warning-description"
    >
      <div className="w-full max-w-xl rounded-2xl border border-amber-300 bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <h2 id="non-desktop-warning-title" className="text-xl font-semibold text-stone-900">
              Desktop experience recommended
            </h2>
            <p id="non-desktop-warning-description" className="text-sm text-stone-700">
              Negation Game multiplayer boards are built for desktop browsers. On mobile or tablet,
              interactions may be buggy, text editing can fail, and changes may not be made reliably.
              Use a computer if you want a reliable experience.
            </p>
            <p className="text-sm font-medium text-amber-700">
              We strongly discourage continuing on a non-desktop device.
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={handleLeave} className="sm:min-w-[140px]">
            Go back
          </Button>
          <Button
            onClick={handleContinue}
            className="sm:min-w-[160px] bg-amber-600 hover:bg-amber-700"
          >
            Continue anyway
          </Button>
        </div>
      </div>
    </div>,
    portalTarget
  );
};
