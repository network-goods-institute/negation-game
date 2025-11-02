import { useEffect, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';

interface UseKeyboardPanningOptions {
  connectMode?: boolean;
  onCancelConnect?: () => void;
  enabled?: boolean;
  forceSave?: () => Promise<void> | void;
}

/**
 * Hook for smooth keyboard-based viewport panning using Arrow keys.
 * Implements press-and-hold behavior with requestAnimationFrame for smooth movement.
 */
export function useKeyboardPanning(options: UseKeyboardPanningOptions = {}) {
  const { connectMode, onCancelConnect, enabled = true, forceSave } = options;
  const rf = useReactFlow();
  const heldKeysRef = useRef<{ [k: string]: boolean }>({});
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const target = e.target as HTMLElement | null;
      const active = (document.activeElement as HTMLElement | null) || null;

      const isEditable = (el: HTMLElement | null) => {
        if (!el) return false;
        const tag = el.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
        if (el.isContentEditable) return true;
        return false;
      };

      if (isEditable(target) || isEditable(active)) return;

      // Allow copy/paste when text is selected
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        return;
      }

      // Handle Cmd+S / Ctrl+S for save
      if ((e.metaKey || e.ctrlKey) && key === 's') {
        e.preventDefault();
        forceSave?.();
        return;
      }

      // Smooth arrow key panning (press-and-hold)
      const isPanKey = (
        key === 'arrowleft' || key === 'arrowright' || key === 'arrowup' || key === 'arrowdown'
      );

      if (isPanKey) {
        // Block panning if any modifier keys are pressed (except for Cmd+S which is handled above)
        if (e.shiftKey || e.altKey || e.metaKey || e.ctrlKey) {
          return;
        }

        heldKeysRef.current[key] = true;
        e.preventDefault();

        if (rafRef.current == null) {
          lastTsRef.current = null;
          const tick = (ts: number) => {
            const last = lastTsRef.current;
            lastTsRef.current = ts;

            if (last != null) {
              const dt = Math.min(50, ts - last) / 1000; // cap delta for stability
              const viewport = rf.getViewport?.();

              if (viewport) {
                const base = 700; // px/sec
                const left = heldKeysRef.current['arrowleft'] ? 1 : 0;
                const right = heldKeysRef.current['arrowright'] ? 1 : 0;
                const up = heldKeysRef.current['arrowup'] ? 1 : 0;
                const down = heldKeysRef.current['arrowdown'] ? 1 : 0;
                const dx = (left - right) * base * dt;
                const dy = (up - down) * base * dt;

                if (dx !== 0 || dy !== 0) {
                  rf.setViewport?.({ x: viewport.x + dx, y: viewport.y + dy, zoom: viewport.zoom }, { duration: 0 });
                }
              }
            }

            // Continue if any pan keys remain held
            const anyHeld = Object.keys(heldKeysRef.current).some(k => heldKeysRef.current[k] === true);
            if (anyHeld) {
              rafRef.current = requestAnimationFrame(tick);
            } else {
              rafRef.current = null;
            }
          };
          rafRef.current = requestAnimationFrame(tick);
        }
        return;
      }

      // Handle escape key for connect mode
      if (key === 'escape' && connectMode) {
        e.preventDefault();
        onCancelConnect?.();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (heldKeysRef.current[key]) {
        heldKeysRef.current[key] = false;
      }

      // Stop loop if nothing held
      const anyHeld = Object.keys(heldKeysRef.current).some(k => heldKeysRef.current[k]);
      if (!anyHeld && rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const onBlur = () => {
      heldKeysRef.current = {};
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    window.addEventListener('keydown', onKeyDown, { capture: true });
    window.addEventListener('keyup', onKeyUp, { capture: true });
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true } as any);
      window.removeEventListener('keyup', onKeyUp, { capture: true } as any);
      window.removeEventListener('blur', onBlur);

      // Cleanup animation frame on unmount
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [enabled, connectMode, onCancelConnect, forceSave, rf]);
}
