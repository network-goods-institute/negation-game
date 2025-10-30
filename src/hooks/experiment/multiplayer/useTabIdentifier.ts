import { useEffect, useRef, useState } from "react";

interface TabIdentifier {
  sessionId: string;
  tabId: string;
  isActiveTab: boolean;
}

const SESSION_ID_KEY = "multiplayer-session-id";
const TAB_ID_KEY = "multiplayer-tab-id";

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

export const useTabIdentifier = (): TabIdentifier => {
  const [isActiveTab, setIsActiveTab] = useState(
    typeof document !== "undefined" ? !document.hidden : true
  );

  const sessionIdRef = useRef<string>("");
  const tabIdRef = useRef<string>("");
  const channelRef = useRef<BroadcastChannel | null>(null);

  if (!sessionIdRef.current && typeof window !== "undefined") {
    try {
      let stored: string | null = null;
      try {
        stored = window.localStorage?.getItem(SESSION_ID_KEY) ?? null;
      } catch {}
      if (stored && typeof stored === "string") {
        sessionIdRef.current = stored;
      } else {
        const gen = generateId();
        try {
          window.localStorage?.setItem(SESSION_ID_KEY, gen);
          sessionIdRef.current = gen;
        } catch {
          sessionIdRef.current = gen;
        }
      }
    } catch {
      sessionIdRef.current = generateId();
    }
  }

  if (!tabIdRef.current && typeof window !== "undefined") {
    try {
      const existing = (window as any).__mpTabId as string | undefined;
      if (existing && typeof existing === "string") {
        tabIdRef.current = existing;
      } else {
        const gen = generateId();
        (window as any).__mpTabId = gen;
        try {
          window.sessionStorage?.setItem(TAB_ID_KEY, gen);
        } catch {}
        tabIdRef.current = gen;
      }
    } catch {
      tabIdRef.current = generateId();
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleVisibilityChange = () => {
      setIsActiveTab(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel("tab-coordination");
      channelRef.current = channel;

      channel.addEventListener("message", (event) => {
        if (event.data.type === "ping") {
          channel.postMessage({
            type: "pong",
            tabId: tabIdRef.current,
          });
        }
      });

      const cleanup = () => {
        channel.postMessage({
          type: "tab-closing",
          tabId: tabIdRef.current,
        });
        channel.close();
      };

      window.addEventListener("beforeunload", cleanup);

      return () => {
        window.removeEventListener("beforeunload", cleanup);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        cleanup();
      };
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return {
    sessionId: sessionIdRef.current,
    tabId: tabIdRef.current,
    isActiveTab,
  };
};
