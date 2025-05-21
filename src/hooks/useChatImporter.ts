import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchSharedChatContent } from "@/actions/chatSharingActions";
import { SavedChat } from "@/types/chat";

/* eslint-disable drizzle/enforce-delete-with-where */

interface UseChatImporterParams {
  currentSpace: string | null;
  isChatListInitialized: boolean;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isFetchingRationales: boolean;
  createNewChat: (initialGraph?: any) => Promise<string | null>;
  updateChat: (
    chatId: string,
    messages: SavedChat["messages"],
    title?: string,
    distillRationaleId?: string | null,
    graph?: SavedChat["graph"],
    immediate?: boolean
  ) => SavedChat | null;
}

export function useChatImporter({
  currentSpace,
  isChatListInitialized,
  isAuthenticated,
  isInitializing,
  isFetchingRationales,
  createNewChat,
  updateChat,
}: UseChatImporterParams) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const importStatusRef = useRef<{
    importing: boolean;
    importId: string | null;
  }>({ importing: false, importId: null });
  const processedIdsRef = useRef<Set<string>>(new Set());

  const handleImport = useCallback(
    async (importId: string) => {
      const toastId = toast.loading("Importing chat...");
      let success = false;

      try {
        const shared = await fetchSharedChatContent(importId);
        if (!shared) throw new Error("Failed to fetch shared content");

        const newChatId = await createNewChat();
        if (!newChatId) throw new Error("Failed to create new chat");

        await updateChat(
          newChatId,
          shared.messages,
          `Imported: ${shared.title}`.substring(0, 100),
          null,
          shared.graph,
          true
        );

        toast.success("Chat imported successfully!", { id: toastId });
        success = true;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to import chat", {
          id: toastId,
        });
      } finally {
        importStatusRef.current = { importing: false, importId: null };
        // Clean up URL
        try {
          const url = new URL(window.location.href);
          if (url.searchParams.has("importChat")) {
            url.searchParams.delete("importChat");
            router.push(url.pathname + url.search, { scroll: false });
          }
        } catch {}
      }
    },
    [createNewChat, updateChat, router]
  );

  useEffect(() => {
    const importId = searchParams.get("importChat");
    if (!importId || !router || !currentSpace) return;
    if (
      !isAuthenticated ||
      !isChatListInitialized ||
      isInitializing ||
      isFetchingRationales
    )
      return;
    if (processedIdsRef.current.has(importId)) {
      // clean URL once
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has("importChat")) {
          url.searchParams.delete("importChat");
          router.push(url.pathname + url.search, { scroll: false });
        }
      } catch {}
      return;
    }
    if (importStatusRef.current.importing) return;

    processedIdsRef.current.add(importId);
    importStatusRef.current = { importing: true, importId };
    handleImport(importId);
  }, [
    searchParams,
    router,
    currentSpace,
    isChatListInitialized,
    isAuthenticated,
    isInitializing,
    isFetchingRationales,
    handleImport,
  ]);
}
