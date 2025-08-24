import { useEffect, useState } from "react";
import { WebsocketProvider } from "y-websocket";

interface CursorData {
  fx?: number;
  fy?: number;
  name: string;
  color: string;
}

type YProvider = WebsocketProvider;

interface UseMultiplayerCursorsProps {
  provider: YProvider | null;
  username: string;
  userColor: string;
}

export const useMultiplayerCursors = ({
  provider,
  username,
  userColor,
}: UseMultiplayerCursorsProps) => {
  const [cursors, setCursors] = useState<Map<number, CursorData>>(new Map());

  // Update awareness identity when username/color ready
  useEffect(() => {
    if (!provider || !username) return;

    provider.awareness.setLocalStateField("user", {
      name: username,
      color: userColor,
      cursor: { fx: 0, fy: 0 },
    });
  }, [provider, username, userColor]);

  // Listen for awareness changes (other users' cursors)
  useEffect(() => {
    if (!provider) return;

    const awareness = provider.awareness;

    const updateCursors = () => {
      const states = awareness.getStates();
      const newCursors = new Map();
      states.forEach((state: any, clientId: number) => {
        if (clientId !== awareness.clientID && state.user?.cursor) {
          newCursors.set(clientId, {
            ...state.user.cursor,
            name: state.user.name,
            color: state.user.color,
          });
        }
      });
      setCursors(newCursors);
    };

    awareness.on("change", updateCursors);

    return () => {
      awareness.off("change", updateCursors);
    };
  }, [provider]);

  return cursors;
};
