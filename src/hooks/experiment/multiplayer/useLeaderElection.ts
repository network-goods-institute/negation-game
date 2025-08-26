import { useEffect, useState } from 'react';
import { WebsocketProvider } from 'y-websocket';

type YProvider = WebsocketProvider | null;

export const useLeaderElection = (provider: YProvider, userId: string) => {
  const [isLeader, setIsLeader] = useState(true);

  useEffect(() => {
    if (!provider || !userId) { setIsLeader(true); return; }
    const awareness = provider.awareness;

    const recalc = () => {
      try {
        const states = awareness.getStates();
        const myId = awareness.clientID;
        let minClient: number | null = null;
        states?.forEach((state: any, clientId: number) => {
          const u = state?.user;
          if (!u) return;
          if ((u.id || u.name) === userId) {
            if (minClient === null || clientId < minClient) minClient = clientId;
          }
        });
        if (minClient == null) { setIsLeader(true); return; }
        setIsLeader(myId === minClient);
      } catch {
        setIsLeader(true);
      }
    };

    recalc();
    awareness.on?.('change', recalc);
    awareness.on?.('update', recalc);
    return () => {
      awareness.off?.('change', recalc);
      awareness.off?.('update', recalc);
    };
  }, [provider, userId]);

  return { isLeader };
};

