import { useEffect, useState } from "react";
import { WebsocketProvider } from "y-websocket";
type YProvider = WebsocketProvider | null;

export const useWriteAccess = (provider: YProvider, userId: string) => {
  const [canWrite] = useState(true);

  useEffect(() => {
    if (!provider || !userId) return;
  }, [provider, userId]);

  return { canWrite };
};
