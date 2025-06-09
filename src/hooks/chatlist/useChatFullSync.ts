import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  fetchUserChatMetadata,
  fetchChatContent,
  updateDbChat,
  ChatMetadata,
} from "@/actions/chat/chatSyncActions";
import { computeChatStateHash } from "@/lib/negation-game/chatUtils";
import { SavedChat } from "@/types/chat";

export interface SyncStats {
  pulled: number;
  pushedUpdates: number;
  pushedCreates: number;
  errors: number;
}
export type SyncActivity = "idle" | "checking" | "pulling" | "saving" | "error";

interface UseChatFullSyncParams {
  currentSpace: string | null;
  isAuthenticated: boolean;
  pendingPushIds: Set<string>;
  currentChatId: string | null;
  savedChats: SavedChat[];
  replaceChat: (id: string, chat: SavedChat) => void;
  deleteChatLocally: (id: string) => void;
  generatingChats: Set<string>;
}

export function useChatFullSync({
  currentSpace,
  isAuthenticated,
  pendingPushIds,
  currentChatId,
  replaceChat,
  deleteChatLocally,
  generatingChats,
}: UseChatFullSyncParams) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncActivity, setSyncActivity] = useState<SyncActivity>("idle");
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [lastSyncStats, setLastSyncStats] = useState<SyncStats | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const backgroundStatsRef = useRef<{
    creates: number;
    updates: number;
    deletes: number;
    errors: number;
  }>({ creates: 0, updates: 0, deletes: 0, errors: 0 });
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const syncChatsRef = useRef<() => Promise<void>>(async () => {});

  const syncChats = useCallback(async () => {
    if (!isAuthenticated || !currentSpace) return;
    setIsSyncing(true);

    const maxRetries = 2;
    const initialDelay = 2000;

    const attemptSync = async (retryCount: number) => {
      setSyncError(null);
      setSyncActivity("checking");

      const bgStats = { ...backgroundStatsRef.current };
      backgroundStatsRef.current = {
        creates: 0,
        updates: 0,
        deletes: 0,
        errors: 0,
      };

      let currentStats: SyncStats = {
        pulled: 0,
        pushedUpdates: bgStats.updates,
        pushedCreates: bgStats.creates,
        errors: bgStats.errors,
      };
      let activitySet = false;

      try {
        setSyncActivity("pulling");
        activitySet = true;

        // Refresh token before sync to handle potential token expiration
        if (typeof window !== "undefined") {
          try {
            const { setPrivyToken } = await import("@/lib/privy/setPrivyToken");
            const tokenRefreshed = await setPrivyToken();
            if (!tokenRefreshed) {
              console.warn("Token refresh returned false during sync startup");
            }
          } catch (tokenError) {
            console.warn(
              "Token refresh failed during sync, continuing anyway:",
              tokenError
            );
          }
        }

        const serverMetadata: ChatMetadata[] =
          await fetchUserChatMetadata(currentSpace);

        let localChats: SavedChat[] = [];
        const localDataString = localStorage.getItem(
          `saved_chats_${currentSpace}`
        );
        if (localDataString) {
          try {
            localChats = (JSON.parse(localDataString) as SavedChat[]).map(
              (c) => ({ ...c, state_hash: c.state_hash || "" })
            );
          } catch {
            localChats = [];
          }
        }

        const serverMap = new Map(serverMetadata.map((m) => [m.id, m]));
        const localMap = new Map(localChats.map((c) => [c.id, c]));
        const promises: Promise<any>[] = [];
        const chatsToUpdateLocally: SavedChat[] = [];
        const chatsToDeleteLocally: string[] = [];
        const chatsToPush: SavedChat[] = [];

        // Pull and update local
        for (const serverChat of serverMetadata) {
          const localChat = localMap.get(serverChat.id);
          if (
            generatingChats.has(serverChat.id) ||
            pendingPushIds.has(serverChat.id)
          )
            continue;

          if (!localChat) {
            currentStats.pulled++;
            promises.push(
              (async () => {
                try {
                  const content = await fetchChatContent(serverChat.id);
                  if (content) {
                    const stateHash = await computeChatStateHash(
                      content.title,
                      content.messages,
                      content.graph
                    );
                    chatsToUpdateLocally.push({
                      id: serverChat.id,
                      title: content.title,
                      messages: content.messages,
                      createdAt: content.createdAt.toISOString(),
                      updatedAt: serverChat.updatedAt.toISOString(),
                      space: currentSpace,
                      state_hash: stateHash,
                      ...(content.distillRationaleId != null
                        ? { distillRationaleId: content.distillRationaleId }
                        : {}),
                      ...(content.graph != null
                        ? { graph: content.graph }
                        : {}),
                    });
                  } else {
                    currentStats.errors++;
                  }
                } catch {
                  currentStats.errors++;
                  throw new Error();
                }
              })()
            );
          } else {
            const localHash =
              localChat.state_hash ||
              (await computeChatStateHash(
                localChat.title,
                localChat.messages,
                localChat.graph
              ));
            const localUpdatedAt = new Date(localChat.updatedAt).getTime();
            const serverUpdatedAt = serverChat.updatedAt.getTime();
            if (
              serverChat.state_hash !== localHash &&
              serverUpdatedAt > localUpdatedAt
            ) {
              currentStats.pulled++;
              promises.push(
                (async () => {
                  try {
                    const content = await fetchChatContent(serverChat.id);
                    if (content) {
                      chatsToUpdateLocally.push({
                        id: serverChat.id,
                        title: content.title,
                        messages: content.messages,
                        createdAt: content.createdAt.toISOString(),
                        updatedAt: content.updatedAt.toISOString(),
                        space: currentSpace,
                        state_hash: serverChat.state_hash,
                        ...(content.distillRationaleId != null
                          ? { distillRationaleId: content.distillRationaleId }
                          : {}),
                        ...(content.graph != null
                          ? { graph: content.graph }
                          : {}),
                      });
                    } else {
                      currentStats.errors++;
                    }
                  } catch {
                    currentStats.errors++;
                    throw new Error();
                  }
                })()
              );
            }
          }
        }

        // Determine deletions and pushes
        for (const localChat of localChats) {
          const serverChat = serverMap.get(localChat.id);
          if (!serverChat) {
            if (!pendingPushIds.has(localChat.id)) {
              const age = Date.now() - new Date(localChat.createdAt).getTime();
              const RECENT_THRESHOLD_MS = 30000;
              if (age >= RECENT_THRESHOLD_MS)
                chatsToDeleteLocally.push(localChat.id);
            }
          } else {
            if (
              !generatingChats.has(localChat.id) &&
              !pendingPushIds.has(localChat.id)
            ) {
              const localHash =
                localChat.state_hash ||
                (await computeChatStateHash(
                  localChat.title,
                  localChat.messages,
                  localChat.graph
                ));
              const localUpdatedAt = new Date(localChat.updatedAt).getTime();
              const serverUpdatedAt = serverChat.updatedAt.getTime();
              if (
                serverChat.state_hash !== localHash &&
                localUpdatedAt > serverUpdatedAt
              ) {
                chatsToPush.push(localChat);
              }
            }
          }
        }

        if (promises.length > 0 || chatsToPush.length > 0) {
          chatsToPush.forEach((chat) => {
            currentStats.pushedUpdates++;
            promises.push(
              updateDbChat(chat).catch((e) => {
                currentStats.errors++;
                throw e;
              })
            );
          });

          const results = await Promise.allSettled(promises);
          if (results.some((r) => r.status === "rejected"))
            throw new Error("One or more sync ops failed");
        }

        // Apply updates locally
        chatsToUpdateLocally.forEach((chat) => {
          if (!pendingPushIds.has(chat.id) && chat.id !== currentChatId)
            replaceChat(chat.id, chat);
        });
        chatsToDeleteLocally.forEach((id) => {
          if (!pendingPushIds.has(id) && id !== currentChatId)
            deleteChatLocally(id);
        });

        setLastSyncTime(Date.now());
        setLastSyncStats(currentStats);
        setSyncError(null);
        setSyncActivity("idle");
        setIsOffline(false);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown sync error";
        const isNetworkError =
          err instanceof TypeError &&
          (message.includes("fetch") || message.includes("network"));

        const isAuthError =
          message.toLowerCase().includes("not authenticated") ||
          message.toLowerCase().includes("authentication required") ||
          message.toLowerCase().includes("must be authenticated") ||
          message.toLowerCase().includes("user not authenticated") ||
          message.toLowerCase().includes("invalid auth token") ||
          message.toLowerCase().includes("jwt") ||
          message.toLowerCase().includes("token");

        // If it's an auth error and we haven't retried yet, try refreshing token and retry
        if (
          isAuthError &&
          retryCount < maxRetries &&
          typeof window !== "undefined"
        ) {
          console.log(
            `Chat sync failed with auth error (attempt ${retryCount + 1}/${maxRetries}), refreshing token and retrying...`
          );
          try {
            const { setPrivyToken } = await import("@/lib/privy/setPrivyToken");
            const tokenRefreshed = await setPrivyToken();
            if (tokenRefreshed) {
              // Wait a moment for token to propagate
              await new Promise((resolve) => setTimeout(resolve, 500));
              // Retry the sync
              return attemptSync(retryCount + 1);
            }
          } catch (tokenError) {
            console.warn("Token refresh failed during retry:", tokenError);
          }
        }

        if (isNetworkError) {
          setSyncActivity("error");
          setSyncError("Network error. Please check connection.");
          if (!isOffline) {
            toast.warning("You appear to be offline. Chat sync paused.", {
              duration: 10000,
            });
            setIsOffline(true);
          }
        } else if (isAuthError && retryCount >= maxRetries) {
          setIsOffline(false);
          setSyncError(
            "Authentication expired. Please refresh the page or log in again."
          );
          setSyncActivity("error");
        } else {
          setIsOffline(false);
          setSyncError(message);
          setSyncActivity("error");
        }
      } finally {
        setIsSyncing(false);
      }
    };

    attemptSync(0).catch(() => setIsSyncing(false));
  }, [
    isAuthenticated,
    currentSpace,
    pendingPushIds,
    currentChatId,
    replaceChat,
    deleteChatLocally,
    generatingChats,
    isOffline,
  ]);

  useEffect(() => {
    syncChatsRef.current = syncChats;
  }, [syncChats]);

  useEffect(() => {
    if (isOffline) {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      return;
    }
    if (isAuthenticated && currentSpace) {
      if (!generatingChats.has(currentChatId || "")) {
        syncChatsRef.current();
      }
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = setInterval(() => {
        if (!generatingChats.has(currentChatId || "")) {
          syncChatsRef.current();
        }
      }, 60000);
      return () => {
        if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      };
    } else {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    }
  }, [
    isAuthenticated,
    currentSpace,
    isOffline,
    currentChatId,
    generatingChats,
  ]);

  const triggerSync = useCallback(() => {
    syncChatsRef.current();
  }, []);

  return {
    isSyncing,
    syncActivity,
    lastSyncTime,
    lastSyncStats,
    syncError,
    isOffline,
    triggerSync,
  };
}
