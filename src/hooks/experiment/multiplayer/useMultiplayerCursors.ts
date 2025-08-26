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
  userId: string;
  username: string;
  userColor: string;
}

export const useMultiplayerCursors = ({
  provider,
  userId,
  username,
  userColor,
}: UseMultiplayerCursorsProps) => {
  const [cursors, setCursors] = useState<Map<number, CursorData>>(new Map());

  // Update awareness identity when username/color ready
  useEffect(() => {
    if (!provider || !username) return;
    const prev = provider.awareness.getLocalState() || {};
    provider.awareness.setLocalState({
      ...prev,
      user: {
        id: userId,
        name: username,
        color: userColor,
        cursor: { fx: 0, fy: 0 },
      },
    });
  }, [provider, userId, username, userColor]);

  // Listen for awareness changes (other users' cursors)
  useEffect(() => {
    if (!provider) return;

    const awareness = provider.awareness;

    const updateCursors = () => {
      const states = awareness.getStates();
      // Deduplicate by user.id, prefer latest cursor with highest ts if provided
      const byUser: Map<string, any> = new Map();
      states.forEach((state: any, clientId: number) => {
        const u = state?.user;
        if (!u?.id || !u?.cursor) return;
        if (u.id === userId) return; // hide local user's own cursor
        const current = byUser.get(u.id);
        const ts = u.cursor?.ts || 0;
        if (!current || ts > (current.user?.cursor?.ts || 0)) {
          byUser.set(u.id, { clientId, user: u });
        }
      });
      const newCursors = new Map<number, CursorData>();
      byUser.forEach((entry) => {
        const { clientId, user } = entry;
        newCursors.set(clientId, {
          ...user.cursor,
          name: user.name,
          color: user.color,
        });
      });
      setCursors(newCursors);
    };

    awareness.on("change", updateCursors);

    return () => {
      awareness.off("change", updateCursors);
    };
  }, [provider, userId]);

  return cursors;
};
