import { useEffect, useState, useCallback } from "react";
import { useTabIdentifier } from "./useTabIdentifier";
import { WebsocketProvider } from "y-websocket";
import { isProductionRequest } from "@/utils/hosts";
type YProvider = WebsocketProvider | null;

export const useWriteAccess = (
  provider: YProvider,
  userId: string,
  opts?: { authenticated?: boolean }
) => {
  const [canWrite, setCanWrite] = useState(true);
  const { sessionId: localSessionId } = useTabIdentifier();

  const calculate = useCallback(() => {
    try {
      const host =
        typeof window !== "undefined" ? window.location.hostname : "";
      const prod = isProductionRequest(host);
      // Default to false for safety - explicit authentication required on production
      const isAuthenticated = opts?.authenticated ?? false;
      if (prod && !isAuthenticated) {
        setCanWrite(false);
        return;
      }
    } catch {}

    if (!provider || !userId) {
      setCanWrite(true);
      return;
    }

    try {
      const awareness = provider.awareness as any;
      const states: Map<number, any> = awareness.getStates();
      const myClientId: number = awareness.clientID ?? awareness.clientId ?? 0;

      // Group by sessionId for the same user; allow all tabs in the winning session group to write.
      const groups = new Map<string, number>(); // sessionKey -> minClientId
      let hasMatch = false;
      states.forEach((state: any, clientId: number) => {
        const u = state?.user;
        if (!u) return;
        if ((u.id || u.name) !== userId) return;
        hasMatch = true;
        const key = String(u.sessionId ?? `client:${clientId}`);
        const prev = groups.get(key);
        if (prev == null || clientId < prev) groups.set(key, clientId);
      });

      if (!hasMatch) {
        setCanWrite(true);
        return;
      }

      // Determine winner group by smallest group min clientId
      let globalMin = Infinity;
      groups.forEach((minId) => {
        if (minId < globalMin) globalMin = minId;
      });

      const localAwarenessState = awareness.getLocalState?.() || {};
      const localAwarenessSession = localAwarenessState?.user?.sessionId as
        | string
        | undefined;

      const candidateKeys: string[] = [];
      if (localAwarenessSession) candidateKeys.push(localAwarenessSession);
      candidateKeys.push(`client:${myClientId}`);
      if (localSessionId) candidateKeys.push(String(localSessionId));

      let myGroupMin: number | undefined;
      let hasCandidateKey = false;
      for (const key of candidateKeys) {
        if (groups.has(key)) {
          myGroupMin = groups.get(key);
          hasCandidateKey = true;
          break;
        }
      }

      const shouldWrite = !hasMatch
        ? true
        : hasCandidateKey
          ? myGroupMin === globalMin
          : false;
      setCanWrite(shouldWrite);
    } catch {
      setCanWrite(true);
    }
  }, [provider, userId, localSessionId, opts?.authenticated]);

  useEffect(() => {
    try {
      calculate();
    } catch {}

    if (!provider || !userId) return;
    const awareness = provider.awareness as any;

    const timeout = setTimeout(calculate, 1000);
    awareness.on?.("change", calculate);

    return () => {
      clearTimeout(timeout);
      awareness.off?.("change", calculate);
    };
  }, [provider, userId, calculate]);

  return { canWrite };
};
