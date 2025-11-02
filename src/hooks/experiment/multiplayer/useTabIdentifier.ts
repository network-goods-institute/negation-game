import { useEffect, useRef, useState } from "react";import { logger } from "@/lib/logger";

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

function generateTabIdWithRetry(): string {
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    const newId = generateId();

    try {
      // Check if sessionStorage already has this ID
      const existing = window.sessionStorage?.getItem(TAB_ID_KEY);
      if (existing && existing === newId) {
        // Rare collision: generate a different ID
        attempts++;
        continue;
      }

      // Set in sessionStorage with a small random delay to reduce race conditions
      setTimeout(() => {
        try {
          window.sessionStorage?.setItem(TAB_ID_KEY, newId);
        } catch (e) {
          // Storage might be unavailable, but we still return the ID
        }
      }, Math.random() * 10); // Small random delay 0-10ms

      return newId;
    } catch (e) {
      attempts++;
    }
  }

  // Fallback: generate ID without sessionStorage checks
  return generateId();
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
        const gen = generateTabIdWithRetry();
        (window as any).__mpTabId = gen;
        tabIdRef.current = gen;
      }
    } catch {
      tabIdRef.current = generateTabIdWithRetry();
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleVisibilityChange = () => {
      setIsActiveTab(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    let channel: BroadcastChannel | null = null;
    let cleanupTimeout: NodeJS.Timeout | null = null;

    if (typeof BroadcastChannel !== "undefined") {
      try {
        channel = new BroadcastChannel("tab-coordination");
        channelRef.current = channel;

        channel.addEventListener("message", (event) => {
          if (event.data.type === "ping") {
            channel?.postMessage({
              type: "pong",
              tabId: tabIdRef.current,
            });
          }
        });

        const cleanup = () => {
          try {
            if (channel && tabIdRef.current) {
              channel.postMessage({
                type: "tab-closing",
                tabId: tabIdRef.current,
              });
            }
          } catch (e) {
            // Channel might already be closed
          } finally {
            try {
              channel?.close();
            } catch (e) {
              // Channel might already be closed
            }
          }
        };

        const handleBeforeUnload = () => {
          // Immediate cleanup for normal page unload
          cleanup();
        };

        const handlePageHide = (event: PageTransitionEvent) => {
          // Additional cleanup for mobile/back navigation scenarios
          if (event.persisted) {
            cleanup();
          }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        window.addEventListener("pagehide", handlePageHide);

        return () => {
          window.removeEventListener("beforeunload", handleBeforeUnload);
          window.removeEventListener("pagehide", handlePageHide);
          document.removeEventListener(
            "visibilitychange",
            handleVisibilityChange
          );

          // Clean up any pending timeout
          if (cleanupTimeout) {
            clearTimeout(cleanupTimeout);
          }

          // Final cleanup
          cleanup();
        };
      } catch (e) {
        logger.warn("Failed to initialize BroadcastChannel:", e);
      }
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
