import { useEffect, useState, useCallback } from "react";
import { WebsocketProvider } from "y-websocket";
type YProvider = WebsocketProvider | null;

export const useWriteAccess = (provider: YProvider, userId: string) => {
  const [canWrite, setCanWrite] = useState(true);

  const calculate = useCallback(() => {
    if (!provider || !userId) {
      setCanWrite(true);
      return;
    }

    try {
      const awareness = provider.awareness;
      const states = awareness.getStates();
      const myClientId = awareness.clientID;

      let lowestClientId: number | null = null;
      let matches = 0;

      states.forEach((state: any, clientId: number) => {
        const user = state?.user;
        if (!user) return;

        if ((user.id || user.name) === userId) {
          matches++;
          if (lowestClientId === null || clientId < lowestClientId) {
            lowestClientId = clientId;
          }
        }
      });

      // If no matching entries for this user are present, prefer local client for writes
      const shouldWrite = matches === 0 ? true : lowestClientId === myClientId;

      setCanWrite(shouldWrite);
    } catch (error) {
      console.warn("[write-access] Error:", error);
      setCanWrite(true);
    }
  }, [provider, userId]);

  useEffect(() => {
    if (!provider || !userId) return;

    const awareness = provider.awareness;

    // Initial grace period to allow stale peers to disappear after reload
    setTimeout(calculate, 1000);

    awareness.on?.("change", calculate);

    return () => {
      awareness.off?.("change", calculate);
    };
  }, [provider, userId, calculate]);

  return { canWrite };
};
