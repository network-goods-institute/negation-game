import { useEffect, useState, useCallback } from "react";
import { WebsocketProvider } from "y-websocket";
type YProvider = WebsocketProvider | null;

export const useLeaderElection = (provider: YProvider, userId: string) => {
  const [isLeader, setIsLeader] = useState(true);

  const calculate = useCallback(() => {
    if (!provider || !userId) {
      setIsLeader(true);
      return;
    }

    try {
      const awareness = provider.awareness;
      const states = awareness.getStates();
      const myClientId = awareness.clientID;

      let lowestClientId: number | null = null;

      states.forEach((state: any, clientId: number) => {
        const user = state?.user;
        if (!user) return;

        if ((user.id || user.name) === userId) {
          if (lowestClientId === null || clientId < lowestClientId) {
            lowestClientId = clientId;
          }
        }
      });

      const shouldBeLeader = lowestClientId === myClientId;

      setIsLeader(shouldBeLeader);
    } catch (error) {
      console.warn("[leader-election] Error:", error);
      setIsLeader(true);
    }
  }, [provider, userId]);

  useEffect(() => {
    if (!provider || !userId) return;

    const awareness = provider.awareness;

    setTimeout(calculate, 1000);

    awareness.on?.("change", calculate);

    return () => {
      awareness.off?.("change", calculate);
    };
  }, [provider, userId, calculate]);

  return { isLeader };
};
