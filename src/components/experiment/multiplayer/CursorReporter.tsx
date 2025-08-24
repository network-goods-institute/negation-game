import { useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { WebsocketProvider } from 'y-websocket';

type YProvider = WebsocketProvider;

interface CursorReporterProps {
  provider: YProvider | null;
  username: string;
  userColor: string;
}

export const CursorReporter: React.FC<CursorReporterProps> = ({
  provider,
  username,
  userColor,
}) => {
  const rf = useReactFlow();

  useEffect(() => {
    if (!provider || !username) return;

    const update = (clientX: number, clientY: number) => {
      const { x: fx, y: fy } = rf.screenToFlowPosition({ x: clientX, y: clientY });
      provider.awareness.setLocalStateField('user', {
        name: username,
        color: userColor,
        cursor: { fx, fy },
      });
    };

    const onPointerMove = (e: PointerEvent) => update(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => update(e.clientX, e.clientY);

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [rf, provider, username, userColor]);

  return null;
};