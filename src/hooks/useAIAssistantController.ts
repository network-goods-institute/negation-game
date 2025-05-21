import React from "react";
import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useUser } from "@/queries/useUser";
import { toast } from "sonner";
import { useSetAtom } from "jotai";
import { initialSpaceTabAtom } from "@/atoms/navigationAtom";
import { handleBackNavigation } from "@/lib/negation-game/backButtonUtils";
import type {
  ChatSettings,
  ChatRationale,
  SavedChat,
  ChatMessage,
} from "@/types/chat";
import type { ViewpointGraph } from "@/atoms/viewpointAtoms";
import { useAssistantInitializer } from "@/hooks/useAssistantInitializer";
import { useChatImporter } from "@/hooks/useChatImporter";
import { useChatFullSync } from "@/hooks/chatList/useChatFullSync";
import { useChatListManagement } from "@/hooks/useChatListManagement";
import { useChatState } from "@/hooks/useChatState";
import { useDiscourseIntegration } from "@/hooks/useDiscourseIntegration";
import type { ChatSidebarProps } from "@/components/chatbot/ChatSidebar";
import type { ChatHeaderProps } from "@/components/chatbot/ChatHeader";
import type { AIAssistantChatProps } from "@/components/chatbot/AIAssistantChat";
import type { AIAssistantRationaleProps } from "@/components/chatbot/AIAssistantRationale";
import type { InitialOptionObject } from "@/types/chatbot";

export function useAIAssistantController() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: privyUser } = usePrivy();
  const { data: userData } = useUser(privyUser?.id);
  const isAuthenticated = !!privyUser;
  const setInitialTab = useSetAtom(initialSpaceTabAtom);

  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  }, []);
  // Watch resize
  useEffect(() => {
    const onResize = () => {
      // no-op; pass isMobile through hook consumer if needed
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // assistant initialization
  const {
    isInitializing,
    isFetchingRationales,
    currentSpace,
    allPointsInSpace,
    ownedPoints,
    endorsedPoints,
    userRationales,
    availableRationales,
  } = useAssistantInitializer(isAuthenticated);

  const [settings, setSettings] = useState<ChatSettings>(() => {
    if (typeof window === "undefined")
      return {
        includeEndorsements: true,
        includeRationales: true,
        includePoints: true,
        includeDiscourseMessages: true,
      };
    const saved = localStorage.getItem("chat_settings");
    return saved
      ? JSON.parse(saved)
      : {
          includeEndorsements: true,
          includeRationales: true,
          includePoints: true,
          includeDiscourseMessages: true,
        };
  });
  useEffect(() => {
    if (typeof window !== "undefined")
      localStorage.setItem("chat_settings", JSON.stringify(settings));
  }, [settings]);

  // chat list and state
  const chatList = useChatListManagement({ currentSpace, isAuthenticated });
  const {
    isInitialized: isChatListInitialized,
    updateChat,
    currentChatId,
    savedChats,
  } = chatList;
  const discourse = useDiscourseIntegration({
    userData,
    isAuthenticated,
    isNonGlobalSpace: currentSpace != null && currentSpace !== "global",
    currentSpace,
    privyUserId: privyUser?.id,
  });
  const ownedPointIds = useMemo(
    () => new Set(ownedPoints.map((p) => p.pointId)),
    [ownedPoints]
  );
  const endorsedPointIds = useMemo(
    () => new Set(endorsedPoints.map((p) => p.pointId)),
    [endorsedPoints]
  );
  const chatState = useChatState({
    currentChatId,
    currentSpace,
    isAuthenticated,
    settings,
    allPointsInSpace,
    ownedPointIds,
    endorsedPointIds,
    userRationales,
    availableRationales,
    storedMessages: discourse.storedMessages,
    discourseUrl: discourse.discourseUrl,
    savedChats,
    updateChat,
    createNewChat: chatList.createNewChat,
  });

  // importer
  useChatImporter({
    currentSpace,
    isChatListInitialized: isChatListInitialized,
    isAuthenticated,
    isInitializing,
    isFetchingRationales,
    createNewChat: chatList.createNewChat,
    updateChat,
  });

  // sync
  const {
    isSyncing,
    syncActivity,
    lastSyncTime,
    lastSyncStats,
    syncError,
    isOffline,
    triggerSync,
  } = useChatFullSync({
    currentSpace,
    isAuthenticated,
    pendingPushIds: chatList.pendingPushIds,
    currentChatId,
    savedChats,
    replaceChat: chatList.replaceChat,
    deleteChatLocally: chatList.deleteChatLocally,
    generatingChats: chatState.generatingChats,
  });
  const isPulling = syncActivity === "pulling";

  // menu / dialog state
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showRationaleSelectionDialog, setShowRationaleSelectionDialog] =
    useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(
    null
  );
  const [editingMessageContent, setEditingMessageContent] = useState("");

  // mode and rationale state
  const [mode, setMode] = useState<"chat" | "create_rationale">("chat");
  const [showGraph, setShowGraph] = useState(true);
  const [linkUrl, setLinkUrl] = useState("");
  const [canvasEnabled, setCanvasEnabled] = useState(false);
  const [rationaleDescription, setRationaleDescription] = useState("");
  const [showDescEditor, setShowDescEditor] = useState(false);
  const [rationaleTopic, setRationaleTopic] = useState("");

  // sync rationale graph if chat changes
  useEffect(() => {
    const chat = savedChats.find((c) => c.id === currentChatId);
    if (chat && chat.graph) {
      setMode("create_rationale");
      setLinkUrl(chat.graph.linkUrl || "");
      setRationaleDescription(chat.graph.description || "");
      setRationaleTopic(chat.graph.topic || "");
    } else {
      setMode("chat");
      setLinkUrl("");
      setRationaleDescription("");
      setRationaleTopic("");
    }
  }, [currentChatId, savedChats]);

  const handleBack = () => handleBackNavigation(router, setInitialTab);

  const handleTriggerEdit = (index: number, content: string) => {
    setEditingMessageIndex(index);
    setEditingMessageContent(content);
    setShowEditDialog(true);
  };
  const handleTriggerRename = (chatId: string, title: string) => {
    chatList.setChatToRename(chatId);
    chatList.setNewChatTitle(title);
  };
  const handleTriggerDelete = (chatId: string) => {
    chatList.setChatToDelete(chatId);
  };
  const handleTriggerDeleteAll = () =>
    chatList.setShowDeleteAllConfirmation(true);
  const handleCreateNewChat = async () => {
    const id = await chatList.createNewChat();
    if (id) setShowMobileMenu(false);
  };
  const initialChatOptions: InitialOptionObject[] = [
    {
      id: "distill",
      title: "Write an Essay from your Rationale",
      prompt: "",
      description: "Select one of your rationales to generate an essay.",
    },
    {
      id: "generate",
      title: "Suggest Points",
      prompt:
        "Help me brainstorm new points or suggest negations for my existing points based on the context you can see (existing points, owned points, endorsements).",
      description:
        "Get suggestions for new points or negations based on your context.",
    },
    {
      id: "create_rationale",
      title: "Create Rationale",
      prompt:
        "Let's start building a new rationale. What topic are you focusing on?",
      description: "Use AI to help structure and generate a new rationale.",
      disabled: false,
      comingSoon: false,
      isEarlyAccess: true,
    },
  ];
  const handleStartChatOption = async (option: InitialOptionObject) => {
    if (option.id === "distill") {
      if (!isAuthenticated || userRationales.length === 0) {
        toast.info(
          "You need to be logged in and have rationales to use this feature."
        );
        return;
      }
      if (!availableRationales.length) {
        toast.info(
          "Login required. No rationales found in this space to distill."
        );
        return;
      }
      setShowRationaleSelectionDialog(true);
      setShowMobileMenu(false);
      return;
    }
    if (option.id === "generate") {
      // standard chat generate flow
      chatState.startChatWithOption(option);
      setShowMobileMenu(false);
      return;
    }
    if (option.id === "create_rationale") {
      if (!isAuthenticated) {
        toast.info("Login required to create rationales.");
        return;
      }
      // Build initial graph for rationale creation
      const initialStatementNode = {
        id: "statement",
        type: "statement",
        data: {
          statement: "What is the main topic or question for this rationale?",
        },
        position: { x: 250, y: 50 },
      } as any;
      const initialGraph: ViewpointGraph = {
        nodes: [initialStatementNode],
        edges: [],
        description: rationaleDescription,
        linkUrl,
        topic: rationaleTopic,
      };
      // Create or reset chat
      let chatIdToUse = currentChatId;
      const currentChat = savedChats.find((c) => c.id === chatIdToUse);
      const needsNew =
        !chatIdToUse ||
        !!(
          currentChat &&
          (currentChat.messages.length > 0 || currentChat.graph)
        );
      if (needsNew) {
        const newId = await chatList.createNewChat(initialGraph);
        if (!newId) {
          toast.error("Failed to create chat for rationale creation.");
          return;
        }
        chatIdToUse = newId;
      } else if (chatIdToUse && currentChat) {
        await chatList.updateChat(
          chatIdToUse,
          currentChat.messages,
          currentChat.title,
          currentChat.distillRationaleId,
          initialGraph
        );
      }
      // Send initial assistant message
      const initialBotMessage: ChatMessage = {
        role: "assistant",
        content:
          "Hey! Let's build a rationale. What topic are you thinking about? Please let me know, also if you paste a discourse link in the top right I'll be able to read it. Additionally, I'll be able to see any changes you make to the graph.",
      };
      const msgs =
        currentChat && !needsNew
          ? [...currentChat.messages, initialBotMessage]
          : [initialBotMessage];
      if (chatIdToUse) {
        await chatList.updateChat(
          chatIdToUse,
          msgs,
          currentChat?.title || "New Rationale Chat",
          null,
          initialGraph
        );
        chatState.setChatMessages(msgs);
      }
      // Reset metadata inputs
      setRationaleDescription("");
      setLinkUrl("");
      setRationaleTopic("");
      setMode("create_rationale");
      setShowMobileMenu(false);
      return;
    }
  };

  const handleFormSubmit = (
    e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();
    if (isPulling) {
      toast.info("Sync in progress...");
      return;
    }
    if (chatState.generatingChats.has(currentChatId || "")) return;
    chatState.handleSubmit();
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      chatState.handleSubmit();
    }
  };
  const handleRationaleSelected = (r: ChatRationale) => {
    chatState.startDistillChat(r.id, r.title, r);
    setShowRationaleSelectionDialog(false);
  };
  const handleCloseRationale = () => setMode("chat");

  // assemble props
  const sidebarProps: ChatSidebarProps = {
    isMobile,
    showMobileMenu,
    isInitializing,
    isAuthenticated,
    savedChats,
    currentChatId,
    currentSpace,
    generatingTitles: chatState.generatingTitles,
    onSwitchChat: chatList.switchChat,
    onNewChat: handleCreateNewChat,
    onTriggerDeleteAll: handleTriggerDeleteAll,
    onTriggerRename: handleTriggerRename,
    onTriggerDelete: handleTriggerDelete,
    onCloseMobileMenu: () => setShowMobileMenu(false),
  };
  const headerProps: ChatHeaderProps = {
    isMobile,
    isAuthenticated,
    isInitializing,
    currentSpace,
    isSyncing,
    syncActivity,
    lastSyncTime,
    lastSyncStats,
    syncError,
    discourse,
    isNonGlobalSpace: currentSpace != null && currentSpace !== "global",
    isGenerating: chatState.generatingChats.has(currentChatId || ""),
    onShowMobileMenu: () => setShowMobileMenu(true),
    onBack: handleBack,
    onTriggerSync: triggerSync,
    isPulling,
    isSaving: syncActivity === "saving",
    isOffline,
    mode,
    showGraph,
    setShowGraph,
    description: rationaleDescription,
    onDescriptionChange: setRationaleDescription,
    showDescEditor,
    onToggleDescriptionEditor: () => setShowDescEditor((f) => !f),
    onCloseRationaleCreator: handleCloseRationale,
    hasGraph: !!savedChats.find((c) => c.id === currentChatId)?.graph,
    onOpenRationaleCreator: () => setMode("create_rationale"),
    canvasEnabled,
    setCanvasEnabled,
    linkUrl,
    setLinkUrl,
    topic: rationaleTopic,
    onTopicChange: setRationaleTopic,
  };
  const chatProps: AIAssistantChatProps = {
    isInitializing,
    isFetchingRationales,
    chatState,
    isGeneratingCurrent: chatState.generatingChats.has(currentChatId || ""),
    isFetchingCurrentContext: chatState.fetchingContextChats.has(
      currentChatId || ""
    ),
    currentStreamingContent:
      chatState.streamingContents.get(currentChatId || "") || "",
    chatList,
    discourse,
    isAuthenticated,
    userRationales,
    availableRationales,
    currentSpace,
    isMobile,
    initialOptions: initialChatOptions,
    onStartChatOption: handleStartChatOption,
    onTriggerEdit: handleTriggerEdit,
    message: chatState.message,
    setMessage: chatState.setMessage,
    onSubmit: handleFormSubmit,
    onKeyDown: handleKeyDown,
    onShowSettings: () => setShowSettingsDialog(true),
  };
  const rationaleProps: AIAssistantRationaleProps = {
    onClose: handleCloseRationale,
    chatState,
    chatList,
    discourse,
    isAuthenticated,
    isInitializing,
    currentSpace,
    allPointsInSpace,
    isMobile,
    showGraph,
    graphData: (savedChats.find((c) => c.id === currentChatId)
      ?.graph as ViewpointGraph) || {
      nodes: [],
      edges: [],
      description: "",
      linkUrl: "",
    },
    onGraphChange: (newGraph, immediateSave) => {
      if (currentChatId) {
        chatList.updateChat(
          currentChatId,
          chatState.chatMessages,
          undefined,
          undefined,
          newGraph,
          immediateSave
        );
      }
    },
    canvasEnabled,
    description: rationaleDescription,
    onDescriptionChange: setRationaleDescription,
    linkUrl,
    onLinkUrlChange: setLinkUrl,
    topic: rationaleTopic,
    onTopicChange: setRationaleTopic,
  };

  // metadata editor props
  const metadataEditorProps = {
    currentSpace,
    topic: rationaleTopic,
    onTopicChange: setRationaleTopic,
    linkUrl,
    onLinkUrlChange: setLinkUrl,
    description: rationaleDescription,
    onDescriptionChange: setRationaleDescription,
    onClose: () => setShowDescEditor(false),
  };
  // selection dialog props
  const selectionDialogProps = {
    isOpen: showRationaleSelectionDialog,
    onOpenChange: setShowRationaleSelectionDialog,
    rationales: availableRationales,
    onRationaleSelected: handleRationaleSelected,
    currentUserId: privyUser?.id,
  };
  // discourse dialogs props
  const discourseConnectDialogProps = {
    isOpen: discourse.showDiscourseDialog,
    onOpenChange: discourse.setShowDiscourseDialog,
    isMobile,
    connectionStatus: discourse.connectionStatus,
    discourseUsername: discourse.discourseUsername,
    setDiscourseUsername: discourse.setDiscourseUsername,
    storedMessages: discourse.storedMessages,
    isConnectingToDiscourse: discourse.isConnectingToDiscourse,
    fetchProgress: discourse.fetchProgress,
    error: discourse.error,
    handleConnect: discourse.handleConnectToDiscourse,
    handleViewMessages: discourse.handleViewMessages,
    handleDeleteMessages: discourse.handleDeleteMessages,
  };
  const discourseMessagesDialogProps = {
    isOpen: discourse.showMessagesModal,
    onOpenChange: discourse.setShowMessagesModal,
    messages: discourse.storedMessages,
  };
  const discourseConsentDialogProps = {
    isOpen: discourse.showConsentDialog,
    onOpenChange: discourse.setShowConsentDialog,
    onConfirm: discourse.handleConsentAndConnect,
    isLoading: discourse.isUpdatingConsent,
  };
  // chat settings dialog props
  const chatSettingsDialogProps = {
    isOpen: showSettingsDialog,
    onOpenChange: setShowSettingsDialog,
    settings,
    setSettings,
    isNonGlobalSpace: currentSpace != null && currentSpace !== "global",
    isAuthenticated,
  };
  // deletion dialogs props
  const deleteDialogProps = {
    chatToDelete: chatList.chatToDelete,
    setChatToDelete: chatList.setChatToDelete,
    savedChats,
    deleteChat: chatList.deleteChat,
  };
  const renameDialogProps = {
    chatToRename: chatList.chatToRename,
    setChatToRename: chatList.setChatToRename,
    newChatTitle: chatList.newChatTitle,
    setNewChatTitle: chatList.setNewChatTitle,
    renameChat: chatList.renameChat,
  };
  const deleteAllDialogProps = {
    showDeleteAllConfirmation: chatList.showDeleteAllConfirmation,
    setShowDeleteAllConfirmation: chatList.setShowDeleteAllConfirmation,
    count: savedChats.length,
    currentSpace,
    deleteAllChats: chatList.deleteAllChats,
  };
  const editMessageDialogProps = {
    open: showEditDialog,
    onOpenChange: (open: boolean) => {
      if (!open) {
        setShowEditDialog(false);
        setEditingMessageIndex(null);
        setEditingMessageContent("");
      }
    },
    initialContent: editingMessageContent,
    onSave: (newContent: string) => {
      if (editingMessageIndex !== null) {
        chatState.handleSaveEdit(editingMessageIndex, newContent);
      }
    },
  };
  // Combine all dialog props
  const dialogsProps = {
    showDescEditor,
    setShowDescEditor,
    metadataEditorProps,
    selectionDialogProps,
    discourseConnectDialogProps,
    discourseMessagesDialogProps,
    discourseConsentDialogProps,
    chatSettingsDialogProps,
    deleteDialogProps,
    renameDialogProps,
    deleteAllDialogProps,
    editMessageDialogProps,
  };

  return {
    sidebarProps,
    headerProps,
    chatProps,
    rationaleProps,
    dialogsProps,
    mode,
  };
}
