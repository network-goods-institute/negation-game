import { useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { WebsocketProvider } from 'y-websocket';
import { usePanDetection } from './common/usePanDetection';

type YProvider = WebsocketProvider;

interface CursorReporterProps {
  provider: YProvider | null;
  username: string;
  userColor: string;
  grabMode?: boolean;
}

export const CursorReporter: React.FC<CursorReporterProps> = ({ provider, username, userColor, grabMode = false }) => {
  const rf = useReactFlow();
  const isPanning = usePanDetection({ grabMode });

  useEffect(() => {
    if (!provider || !username) return;

    const update = (event: PointerEvent | MouseEvent) => {
      if (isPanning) return;

      const target = event.target as HTMLElement | null;
      const graphRoot = target?.closest('.react-flow');
      const onNode = target?.closest('.react-flow__node');
      const buttons = 'buttons' in event ? event.buttons : 0;
      const isMiddleDrag = Boolean(graphRoot) && (buttons & 4) === 4;
      const isHandDrag = grabMode && Boolean(graphRoot) && !onNode && (buttons & 1) === 1;
      if (isMiddleDrag || isHandDrag) {
        return;
      }

      const { clientX, clientY } = event;
      const { x: fx, y: fy } = rf.screenToFlowPosition({ x: clientX, y: clientY });
      const prev = provider.awareness.getLocalState() || {};
      const prevUser = prev.user || {};
      provider.awareness.setLocalState({
        ...prev,
        user: {
          ...prevUser,
          name: username,
          color: userColor,
          cursor: { fx, fy, ts: Date.now() },
        },
      });
    };

    const onPointerMove = (e: PointerEvent) => update(e);
    const onMouseMove = (e: MouseEvent) => update(e);

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [rf, provider, username, userColor, grabMode, isPanning]);

  return null;
};