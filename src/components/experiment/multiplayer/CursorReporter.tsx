import { useEffect, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import { WebsocketProvider } from 'y-websocket';
import { usePanDetection } from './common/usePanDetection';

type YProvider = WebsocketProvider;

interface CursorReporterProps {
  provider: YProvider | null;
  username: string;
  userColor: string;
  grabMode?: boolean;
  canWrite?: boolean;
  broadcastCursor?: boolean;
}

export const CursorReporter: React.FC<CursorReporterProps> = ({ provider, username, userColor, grabMode = false, canWrite = true, broadcastCursor = true }) => {
  const rf = useReactFlow();
  const isPanning = usePanDetection({ grabMode });
  const latestPointerRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const pointerRafIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<{ ts: number; fx: number; fy: number } | null>(null);
  const MIN_INTERVAL_MS = 100;
  const MIN_DELTA_PX = 6;
  const lastActivityRef = useRef<number>(Date.now());
  const IDLE_MS = 30000;

  useEffect(() => {
    if (!provider || !username || !broadcastCursor) return;

    const cancelScheduled = () => {
      if (pointerRafIdRef.current != null && typeof window !== 'undefined') {
        window.cancelAnimationFrame(pointerRafIdRef.current);
        pointerRafIdRef.current = null;
      }
    };

    const processPointer = () => {
      pointerRafIdRef.current = null;
      const payload = latestPointerRef.current;
      if (!payload) return;
      latestPointerRef.current = null;
      if (typeof document !== 'undefined' && document.hidden) return;
      const now = Date.now();
      if (now - lastActivityRef.current > IDLE_MS) return;
      const { clientX, clientY } = payload;
      const { x: fx, y: fy } = rf.screenToFlowPosition({ x: clientX, y: clientY });
      const last = lastSentRef.current;
      if (last) {
        const dt = now - last.ts;
        const dx = fx - last.fx;
        const dy = fy - last.fy;
        const dist2 = dx * dx + dy * dy;
        if (dt < MIN_INTERVAL_MS && dist2 < MIN_DELTA_PX * MIN_DELTA_PX) {
          return;
        }
      }
      const prev = provider.awareness.getLocalState() || {};
      const prevUser = prev.user || {};
      provider.awareness.setLocalState({
        ...prev,
        user: {
          ...prevUser,
          name: username,
          color: userColor,
          cursor: { fx, fy, ts: now },
        },
      });
      lastSentRef.current = { ts: now, fx, fy };
    };

    const scheduleProcess = () => {
      if (typeof window === 'undefined') {
        processPointer();
        return;
      }
      if (pointerRafIdRef.current == null) {
        pointerRafIdRef.current = window.requestAnimationFrame(processPointer);
      }
    };

    const update = (event: PointerEvent | MouseEvent) => {
      lastActivityRef.current = Date.now();
      if (isPanning) {
        latestPointerRef.current = null;
        cancelScheduled();
        return;
      }

      const target = event.target as HTMLElement | null;
      const graphRoot = target?.closest('.react-flow');
      const onNode = target?.closest('.react-flow__node');
      const buttons = 'buttons' in event ? event.buttons : 0;
      const isMiddleDrag = Boolean(graphRoot) && (buttons & 4) === 4;
      const isHandDrag = grabMode && Boolean(graphRoot) && !onNode && (buttons & 1) === 1;
      if (isMiddleDrag || isHandDrag) {
        latestPointerRef.current = null;
        cancelScheduled();
        return;
      }

      latestPointerRef.current = { clientX: event.clientX, clientY: event.clientY };
      scheduleProcess();
    };

    const onPointerMove = (e: PointerEvent) => update(e);
    const onMouseMove = (e: MouseEvent) => update(e);

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('mousemove', onMouseMove);
      latestPointerRef.current = null;
      cancelScheduled();
    };
  }, [rf, provider, username, userColor, grabMode, isPanning, broadcastCursor]);

  return null;
};