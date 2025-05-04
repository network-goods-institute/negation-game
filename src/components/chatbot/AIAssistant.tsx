"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUser } from "@/queries/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { EndorsedPoint } from "@/actions/generateDistillRationaleChatBotResponse";
import { nanoid } from "nanoid";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AuthenticatedActionButton } from "@/components/AuthenticatedActionButton";
import { fetchUserEndorsedPoints } from "@/actions/fetchUserEndorsedPoints";
import { fetchProfilePoints, ProfilePoint } from "@/actions/fetchProfilePoints";
import { getSpace } from "@/actions/getSpace";
import { AutosizeTextarea } from "../ui/autosize-textarea";
import { fetchViewpoints } from "@/actions/fetchViewpoints";
import { DiscourseConnectDialog } from "@/components/chatbot/DiscourseConnectDialog";
import { DiscourseMessagesDialog } from "@/components/chatbot/DiscourseMessagesDialog";
import { DiscourseConsentDialog } from "@/components/chatbot/DiscourseConsentDialog";
import { ChatSettingsDialog } from "@/components/chatbot/ChatSettingsDialog";
import { RationaleSelectionDialog } from "@/components/chatbot/RationaleSelectionDialog";
import { useSetAtom } from 'jotai';
import { initialSpaceTabAtom } from '@/atoms/navigationAtom';
import { handleBackNavigation } from '@/lib/negation-game/backButtonUtils';
import { ChatRationale, ChatSettings, SavedChat, ChatMessage } from '@/types/chat';
import { useDiscourseIntegration } from "@/hooks/useDiscourseIntegration";
import { useChatListManagement } from "@/hooks/useChatListManagement";
import { useChatState } from "@/hooks/useChatState";
import { ChatSidebar } from './ChatSidebar';
import { computeChatStateHash } from "@/lib/negation-game/chatUtils";
import {
    fetchUserChatMetadata,
    fetchChatContent,
    updateDbChat,
    ChatMetadata
} from "@/actions/chatSyncActions";
import { fetchSharedChatContent } from "@/actions/chatSharingActions";
import { ChatHeader } from "./ChatHeader";
import { ChatMessageArea } from "./ChatMessageArea";
import { ChatInputForm } from "./ChatInputForm";
import { fetchAllSpacePoints, PointInSpace } from "@/actions/fetchAllSpacePoints";
import { RationaleCreator } from "./RationaleCreator";
import { ViewpointGraph } from "@/atoms/viewpointAtoms";
import { StatementNode } from "@/components/graph/StatementNode";

type OwnedPoint = ProfilePoint;

export type InitialOptionObject = {
    id: 'distill' | 'build' | 'generate' | 'create_rationale';
    title: string;
    prompt: string;
    description: string;
    disabled?: boolean;
    comingSoon?: boolean;
};

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkIsMobile();
        window.addEventListener('resize', checkIsMobile);

        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    return isMobile;
}

interface SyncStats {
    pulled: number;
    pushedUpdates: number;
    pushedCreates: number;
    errors: number;
}

interface BackgroundSyncStatsRef {
    creates: number;
    updates: number;
    deletes: number;
    errors: number;
}

export default function AIAssistant() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user: privyUser, authenticated } = usePrivy();
    const { data: userData } = useUser(privyUser?.id);
    const isMobile = useIsMobile();
    const isAuthenticated = !!privyUser;
    const setInitialTab = useSetAtom(initialSpaceTabAtom);

    const [isInitializing, setIsInitializing] = useState(true);
    const [currentSpace, setCurrentSpace] = useState<string | null>(null);
    const [isFetchingRationales, setIsFetchingRationales] = useState(true);
    const [endorsedPoints, setEndorsedPoints] = useState<EndorsedPoint[]>([]);
    const [ownedPoints, setOwnedPoints] = useState<OwnedPoint[]>([]);
    const [allPointsInSpace, setAllPointsInSpace] = useState<PointInSpace[]>([]);
    const [userRationales, setUserRationales] = useState<ChatRationale[]>([]);
    const [availableRationales, setAvailableRationales] = useState<ChatRationale[]>([]);
    const [settings, setSettings] = useState<ChatSettings>(() => {
        if (typeof window !== 'undefined') {
            const savedSettings = localStorage.getItem('chat_settings');
            if (savedSettings) {
                try { return JSON.parse(savedSettings); } catch (e) { /* Ignore error */ }
            }
        }
        return { includeEndorsements: true, includeRationales: true, includePoints: true, includeDiscourseMessages: true };
    });
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('chat_settings', JSON.stringify(settings));
        }
    }, [settings]);

    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [showSettingsDialog, setShowSettingsDialog] = useState(false);

    const [showRationaleSelectionDialog, setShowRationaleSelectionDialog] = useState(false);

    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
    const [editingMessageContent, setEditingMessageContent] = useState<string>("");

    const [isSyncing, setIsSyncing] = useState(false);
    const [syncActivity, setSyncActivity] = useState<'idle' | 'checking' | 'pulling' | 'saving' | 'error'>('idle');
    const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
    const [lastSyncStats, setLastSyncStats] = useState<SyncStats | null>(null);
    const [syncError, setSyncError] = useState<string | null>(null);
    const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [isOffline, setIsOffline] = useState<boolean>(false);

    const backgroundStatsRef = useRef<BackgroundSyncStatsRef>({ creates: 0, updates: 0, deletes: 0, errors: 0 });
    const importStatusRef = useRef<{ importing: boolean, importId: string | null }>({ importing: false, importId: null });
    const processedImportIdsRef = useRef(new Set<string>());

    const isNonGlobalSpace = currentSpace !== null && currentSpace !== 'global';

    const chatList = useChatListManagement({
        currentSpace,
        isAuthenticated,
        onBackgroundCreateSuccess: (chatId) => {
            backgroundStatsRef.current.creates++;
        },
        onBackgroundCreateError: (chatId, error) => {
            backgroundStatsRef.current.errors++;
        },
        onBackgroundUpdateSuccess: (chatId) => {
            backgroundStatsRef.current.updates++;
        },
        onBackgroundUpdateError: (chatId, error) => {
            backgroundStatsRef.current.errors++;
        },
        onBackgroundDeleteSuccess: (chatId) => {
            backgroundStatsRef.current.deletes++;
        },
        onBackgroundDeleteError: (chatId, error) => {
            backgroundStatsRef.current.errors++;
        }
    });
    const {
        isInitialized: isChatListInitialized,
    } = chatList;
    const discourse = useDiscourseIntegration({ userData, isAuthenticated, isNonGlobalSpace, currentSpace, privyUserId: privyUser?.id });
    const ownedPointIds = useMemo(() => new Set(ownedPoints.map(p => p.pointId)), [ownedPoints]);
    const endorsedPointIds = useMemo(() => new Set(endorsedPoints.map(p => p.pointId)), [endorsedPoints]);
    const chatState = useChatState({
        currentChatId: chatList.currentChatId,
        currentSpace,
        isAuthenticated,
        settings,
        allPointsInSpace,
        ownedPointIds,
        endorsedPointIds,
        userRationales,
        availableRationales,
        storedMessages: discourse.storedMessages,
        savedChats: chatList.savedChats,
        updateChat: chatList.updateChat,
        createNewChat: chatList.createNewChat,
    });

    const handleImportChat = useCallback(async (importChatId: string) => {
        let toastId = toast.loading("Importing chat...");
        let importSuccess = false;

        try {
            const sharedContent = await fetchSharedChatContent(importChatId);
            if (!sharedContent) {
                throw new Error("Failed to fetch shared content");
            }

            const newChatId = await chatList.createNewChat();
            if (!newChatId || typeof newChatId !== 'string') {
                throw new Error("Failed to create new chat");
            }

            await chatList.updateChat(
                newChatId,
                sharedContent.messages,
                `Imported: ${sharedContent.title}`.substring(0, 100)
            );
            toast.success("Chat imported successfully!", { id: toastId });
            importSuccess = true;

        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Failed to import chat",
                { id: toastId }
            );
        } finally {
            importStatusRef.current = { importing: false, importId: null };

            if (importSuccess) {
                try {
                    const currentUrl = new URL(window.location.href);
                    if (currentUrl.searchParams.has('importChat')) {
                        // eslint-disable-next-line drizzle/enforce-delete-with-where
                        currentUrl.searchParams.delete('importChat');
                        const newUrl = currentUrl.pathname + currentUrl.search;
                        router.push(newUrl, { scroll: false });
                    }
                } catch (e) {
                }
            } else {
                if (router && currentSpace) {
                    try {
                        const currentUrl = new URL(window.location.href);
                        if (currentUrl.searchParams.has('importChat')) {
                            // eslint-disable-next-line drizzle/enforce-delete-with-where
                            currentUrl.searchParams.delete('importChat');
                            const newUrl = currentUrl.pathname + currentUrl.search;
                            router.push(newUrl, { scroll: false });
                        }
                    } catch (e) { /* Ignore cleanup error on fail */ }
                }
            }
        }
    }, [
        router,
        currentSpace,
        chatList
    ]);

    useEffect(() => {
        const importChatId = searchParams.get('importChat');

        if (!importChatId || !router || !currentSpace) {
            return;
        }

        if (processedImportIdsRef.current.has(importChatId)) {
            try {
                const currentUrl = new URL(window.location.href);
                if (currentUrl.searchParams.has('importChat')) {
                    // eslint-disable-next-line drizzle/enforce-delete-with-where
                    currentUrl.searchParams.delete('importChat');
                    const newUrl = currentUrl.pathname + currentUrl.search;
                    router.push(newUrl, { scroll: false });
                }
            } catch (e) {/* Ignore error */ }
            return;
        }

        if (!isAuthenticated || !isChatListInitialized || isInitializing || isFetchingRationales) {
            return;
        }

        if (importStatusRef.current.importing) {
            if (importStatusRef.current.importId === importChatId) {
            }
            return;
        }

        try {
            const currentUrl = new URL(window.location.href);
            if (currentUrl.searchParams.has('importChat')) {
                // eslint-disable-next-line drizzle/enforce-delete-with-where
                currentUrl.searchParams.delete('importChat');
                const newUrl = currentUrl.pathname + currentUrl.search;
                router.push(newUrl, { scroll: false });
            }
        } catch (e) {
        }

        importStatusRef.current = { importing: true, importId: importChatId };
        processedImportIdsRef.current.add(importChatId);

        handleImportChat(importChatId);

    }, [
        searchParams,
        isChatListInitialized,
        isAuthenticated,
        isInitializing,
        isFetchingRationales,
        handleImportChat,
        currentSpace,
        router,
    ]);

    useEffect(() => {
        const initializeAssistant = async () => {
            setIsInitializing(true);
            setIsFetchingRationales(true);
            try {
                const space = await getSpace();
                setCurrentSpace(space);
                if (isAuthenticated) {
                    const [allPointsResult, profilePointsResult, endorsedPointsResult] = await Promise.all([
                        fetchAllSpacePoints(),
                        fetchProfilePoints(),
                        fetchUserEndorsedPoints(),
                    ]);

                    setAllPointsInSpace(allPointsResult || []);
                    setOwnedPoints(profilePointsResult || []);
                    setEndorsedPoints(endorsedPointsResult || []);

                    let fetchedRationales: any[] = [];
                    try {
                        fetchedRationales = await fetchViewpoints(space);
                    } catch (rationaleError) {
                        toast.error("Failed to load rationales for distillation.");
                    } finally {
                        setIsFetchingRationales(false);
                    }

                    const convertedRationales: ChatRationale[] = (fetchedRationales || []).map((r: any): ChatRationale => {
                        const defaultGraph = { nodes: [], edges: [] };
                        const graphData = r.graph || defaultGraph;
                        const defaultStats = { views: 0, copies: 0, totalCred: 0, averageFavor: 0 };
                        const statsData = r.statistics || defaultStats;
                        return {
                            id: String(r.id || nanoid()),
                            title: String(r.title || 'Untitled Rationale'),
                            description: String(r.description || ''),
                            author: String(r.authorUsername || 'Unknown Author'),
                            authorId: String(r.authorId || 'unknown'),
                            authorUsername: String(r.authorUsername || 'unknown'),
                            createdAt: String(r.createdAt || new Date().toISOString()),
                            graph: {
                                nodes: (graphData.nodes || []).map((n: any) => ({ id: String(n.id || nanoid()), type: ["point", "statement", "addPoint"].includes(n.type) ? n.type as "point" | "statement" | "addPoint" : "statement", data: { content: n.data?.content ? String(n.data.content) : undefined, statement: n.data?.statement ? String(n.data.statement) : undefined, pointId: n.data?.pointId != null ? Number(n.data.pointId) : undefined } })),
                                edges: (graphData.edges || []).map((e: any) => ({ id: String(e.id || nanoid()), type: String(e.type || 'default'), source: String(e.source || ''), target: String(e.target || '') }))
                            },
                            statistics: { views: Number(statsData.views || 0), copies: Number(statsData.copies || 0), totalCred: Number(statsData.totalCred || 0), averageFavor: Number(statsData.averageFavor || 0) }
                        };
                    });
                    setUserRationales(convertedRationales);
                    setAvailableRationales(convertedRationales);
                } else {
                    setAllPointsInSpace([]);
                    setOwnedPoints([]);
                    setEndorsedPoints([]);
                    setUserRationales([]);
                    setAvailableRationales([]);
                    setIsFetchingRationales(false);
                }
            } catch (error) {
                setCurrentSpace('global');
                setAllPointsInSpace([]);
                setOwnedPoints([]);
                setEndorsedPoints([]);
                setUserRationales([]);
                setAvailableRationales([]);
                setIsFetchingRationales(false);
            } finally {
                setTimeout(() => setIsInitializing(false), 200);
            }
        };
        if (authenticated !== null && authenticated !== undefined) {
            initializeAssistant();
        }
    }, [authenticated, isAuthenticated]);

    const handleTriggerRename = (chatId: string, currentTitle: string) => {
        chatList.setChatToRename(chatId);
        chatList.setNewChatTitle(currentTitle);
    };
    const handleTriggerDelete = (chatId: string) => {
        chatList.setChatToDelete(chatId);
    };
    const handleTriggerDeleteAll = () => {
        chatList.setShowDeleteAllConfirmation(true);
    };

    const handleCreateNewChat = async () => {
        const newIdResult = await chatList.createNewChat();
        if (newIdResult) {
            setShowMobileMenu(false);
        }
    };
    const handleStartChatOption = async (option: InitialOptionObject) => {
        if (option.disabled || option.comingSoon) return;

        if (option.id === 'distill') {
            if (!isAuthenticated || userRationales.length === 0) {
                toast.info("You need to be logged in and have rationales to use this feature.");
                return;
            }
            if (!isAuthenticated || availableRationales.length === 0) {
                toast.info("Login required. No rationales found in this space to distill.");
                return;
            }
            setShowRationaleSelectionDialog(true);
            setShowMobileMenu(false);
        } else if (option.id === 'create_rationale') {
            console.log("[AIAssistant] Handling 'create_rationale' option.");
            if (!isAuthenticated) {
                toast.info("Login required to create rationales.");
                return;
            }

            const initialStatementNode: StatementNode = {
                id: 'statement',
                type: 'statement',
                data: { statement: 'What is the main topic or question for this rationale?' },
                position: { x: 250, y: 50 },
            };
            const initialGraph: ViewpointGraph = {
                nodes: [initialStatementNode],
                edges: [],
            };

            let chatIdToUse = chatList.currentChatId;
            console.log(`[AIAssistant] Current chat ID before create: ${chatIdToUse}`);
            const currentChat = chatList.savedChats.find(c => c.id === chatIdToUse);
            const needsNewChat = !chatIdToUse || (currentChat && (currentChat.messages.length > 0 || (currentChat.graph && (currentChat.graph.nodes.length > 0 || currentChat.graph.edges.length > 0))));

            if (needsNewChat) {
                console.log('[AIAssistant] No current chat or chat has messages/graph, creating new one for rationale...');
                const newId = await chatList.createNewChat(initialGraph);
                console.log(`[AIAssistant] Called createNewChat, result ID: ${newId}`);
                if (!newId) {
                    toast.error("Failed to create a new chat session for rationale creation.");
                    return;
                }
                chatIdToUse = newId;
            } else {
                // If using existing chat, ensure its graph is set to the initial state
                // Note: This might overwrite existing work if the user switches back without saving. Consider implications.
                // For now, let's update the existing chat's graph to the initial state.
                if (chatIdToUse && currentChat) {
                    console.log('[AIAssistant] Using existing empty chat, ensuring initial graph state.');
                    chatList.updateChat(chatIdToUse, currentChat.messages, currentChat.title, currentChat.distillRationaleId, initialGraph);
                }
            }

            console.log(`[AIAssistant] Chat ID to use for rationale: ${chatIdToUse}`);

            const initialBotMessage: ChatMessage = {
                role: 'assistant',
                content: "Hey! Let's build a rationale. What topic are you thinking about? Please let me know, also if you paste a discourse link in the top right I'll be able to read it. Additionally, I'll be able to see any changes you make to the graph."
            };

            const messagesToUpdate = needsNewChat ? [initialBotMessage] : (currentChat?.messages || []).concat(initialBotMessage);
            const titleToUpdate = needsNewChat ? "New Rationale Chat" : (currentChat?.title || "Rationale Chat");
            if (chatIdToUse) {
                chatList.updateChat(chatIdToUse, messagesToUpdate, titleToUpdate, null, initialGraph);
            } else {
                console.error("[AIAssistant] Critical error: chatIdToUse is null/undefined before updateChat in create_rationale flow.");
                toast.error("An internal error occurred while preparing the rationale chat.");
            }

            // Set component state *after* updating the persistent state
            setRationaleGraph(initialGraph);
            setLinkUrl('');
            console.log('[AIAssistant] Setting mode to create_rationale');
            setMode('create_rationale');
            setShowMobileMenu(false);
        } else {
            chatState.startChatWithOption(option);
            setShowMobileMenu(false);
        }
    };
    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (chatState.generatingChats.has(chatList.currentChatId || "")) return;
        chatState.handleSubmit(e);
    };
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (chatState.message.trim() && !chatState.generatingChats.has(chatList.currentChatId || "")) {
                chatState.handleSubmit();
            }
        }
    };

    const syncChats = useCallback(async () => {
        if (!isAuthenticated || !currentSpace) {
            return;
        }

        setIsSyncing(true);

        const currentPendingPushIds = chatList.pendingPushIds;
        if (currentPendingPushIds.size > 0) {
        }

        const maxRetries = 2;
        const initialDelay = 2000;

        const attemptSync = async (retryCount: number) => {
            setSyncError(null);
            setSyncActivity('checking');

            const bgStats = { ...backgroundStatsRef.current };
            backgroundStatsRef.current = { creates: 0, updates: 0, deletes: 0, errors: 0 };

            let currentStats: SyncStats = {
                pulled: 0,
                pushedUpdates: bgStats.updates,
                pushedCreates: bgStats.creates,
                errors: bgStats.errors
            };
            let activitySet = false;

            try {
                setSyncActivity('pulling');
                activitySet = true;

                const serverMetadata: ChatMetadata[] = await fetchUserChatMetadata(currentSpace);

                let localChats: SavedChat[] = [];
                const localDataString = localStorage.getItem(`saved_chats_${currentSpace}`);
                if (localDataString) {
                    try {
                        localChats = (JSON.parse(localDataString) as SavedChat[]).map(c => ({ ...c, state_hash: c.state_hash || "" }));
                    } catch (e) {
                        localChats = [];
                    }
                }

                const serverMap = new Map(serverMetadata.map(m => [m.id, m]));
                const localMap = new Map(localChats.map(c => [c.id, c]));
                const promisesToAwait: Promise<any>[] = [];
                const chatsToUpdateLocally: SavedChat[] = [];
                const chatsToDeleteLocally: string[] = [];
                const chatsToPush: SavedChat[] = [];

                for (const serverChat of serverMetadata) {
                    const localChat = localMap.get(serverChat.id);

                    if (chatState.generatingChats.has(serverChat.id)) {
                        continue;
                    }

                    if (currentPendingPushIds.has(serverChat.id)) {
                        continue;
                    }

                    if (!localChat) {
                        if (!activitySet) { setSyncActivity('pulling'); activitySet = true; }
                        currentStats.pulled++;
                        promisesToAwait.push((async () => {
                            try {
                                const content = await fetchChatContent(serverChat.id);
                                if (content) {
                                    const stateHash = await computeChatStateHash(content.title, content.messages);
                                    chatsToUpdateLocally.push({
                                        ...content,
                                        id: serverChat.id,
                                        state_hash: stateHash,
                                        createdAt: content.createdAt.toISOString(),
                                        updatedAt: serverChat.updatedAt.toISOString(),
                                        space: currentSpace
                                    } as SavedChat);
                                } else {
                                    currentStats.errors++;
                                }
                            } catch (e) { currentStats.errors++; throw e; }
                        })());
                    } else {
                        const localHash = localChat.state_hash || await computeChatStateHash(localChat.title, localChat.messages);
                        const localUpdatedAt = new Date(localChat.updatedAt).getTime();
                        const serverUpdatedAt = serverChat.updatedAt.getTime();

                        if (serverChat.state_hash !== localHash && serverUpdatedAt > localUpdatedAt) {
                            if (currentPendingPushIds.has(serverChat.id)) {
                                continue;
                            }
                            if (!activitySet) { setSyncActivity('pulling'); activitySet = true; }
                            currentStats.pulled++;
                            promisesToAwait.push((async () => {
                                try {
                                    const content = await fetchChatContent(serverChat.id);
                                    if (content) {
                                        chatsToUpdateLocally.push({
                                            ...content,
                                            id: serverChat.id,
                                            state_hash: serverChat.state_hash,
                                            createdAt: content.createdAt.toISOString(),
                                            updatedAt: serverChat.updatedAt.toISOString(),
                                            space: currentSpace
                                        } as SavedChat);
                                    } else { currentStats.errors++; }
                                } catch (e) { currentStats.errors++; throw e; }
                            })());
                        }
                    }
                }

                for (const localChat of localChats) {
                    const serverChat = serverMap.get(localChat.id);
                    if (!serverChat) {
                        if (currentPendingPushIds.has(localChat.id)) {
                            continue;
                        }

                        const creationTime = new Date(localChat.createdAt).getTime();
                        const now = Date.now();
                        const ageInMs = now - creationTime;
                        const RECENT_THRESHOLD_MS = 30000;

                        if (ageInMs < RECENT_THRESHOLD_MS) {
                            continue;
                        } else {
                            chatsToDeleteLocally.push(localChat.id);
                        }
                    } else {
                        if (chatState.generatingChats.has(localChat.id)) {
                            continue;
                        }

                        if (currentPendingPushIds.has(localChat.id)) {
                            continue;
                        }

                        const localHash =
                            localChat.state_hash ||
                            (await computeChatStateHash(localChat.title, localChat.messages));
                        const localUpdatedAt = new Date(localChat.updatedAt).getTime();
                        const serverUpdatedAt = serverChat.updatedAt.getTime();

                        if (serverChat.state_hash !== localHash && localUpdatedAt > serverUpdatedAt) {
                            chatsToPush.push(localChat);
                        }
                    }
                }

                if (promisesToAwait.length > 0 || chatsToPush.length > 0) {

                    chatsToPush.forEach(localChat => {
                        if (currentPendingPushIds.has(localChat.id)) {
                            return;
                        }

                        if (!activitySet) { setSyncActivity('saving'); activitySet = true; }
                        currentStats.pushedUpdates++;
                        promisesToAwait.push(updateDbChat(localChat).catch(e => {
                            currentStats.errors++;
                            throw e;
                        }));
                    });

                    const results = await Promise.allSettled(promisesToAwait);

                    if (results.some(result => result.status === 'rejected')) {
                        results.forEach(result => {
                            if (result.status === 'rejected') {
                            }
                        });
                        throw new Error("One or more sync operations failed.");
                    }
                } else {
                }

                chatsToUpdateLocally.forEach(chat => {
                    if (currentPendingPushIds.has(chat.id)) {
                        return;
                    }
                    chatList.replaceChat(chat.id, chat);
                });
                chatsToDeleteLocally.forEach(id => {
                    if (currentPendingPushIds.has(id)) {
                        return;
                    }
                    try {
                        chatList.deleteChatLocally(id);
                    } catch (e) {
                        currentStats.errors++;
                    }
                });

                setLastSyncTime(Date.now());
                setLastSyncStats(currentStats);
                setSyncError(null);
                setSyncActivity('idle');
                setIsOffline(false);

            } catch (error) {
                const message = error instanceof Error ? error.message : "An unknown error occurred during sync";

                const isNetworkError = error instanceof TypeError && (message.includes('fetch') || message.includes('network'));

                if (isNetworkError) {
                    setSyncActivity('error');
                    setSyncError("Network error. Please check connection.");
                    if (!isOffline) {
                        toast.warning("You appear to be offline. Chat sync paused. Please check your connection and manually sync when back online.", { duration: 10000 });
                        setIsOffline(true);
                    }
                    return;
                } else {
                    setIsOffline(false);
                    setSyncError(message);
                    setSyncActivity('error');
                    if (retryCount < maxRetries) {
                        const delay = initialDelay * Math.pow(2, retryCount);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        await attemptSync(retryCount + 1);
                        return;
                    } else {
                        toast.error(`Chat sync failed: ${message.substring(0, 100)}`);
                        setLastSyncStats(null);
                    }
                }
            } finally {
                setIsSyncing(false);
            }
        };

        try {
            await attemptSync(0);
        } finally {
            setIsSyncing(false);
        }

    }, [isAuthenticated, currentSpace, chatList, chatState.generatingChats, isOffline]);

    const prevDeps = useRef({ isAuthenticated, currentSpace });
    const syncChatsRef = useRef(syncChats);

    useEffect(() => {
        syncChatsRef.current = syncChats;
    }, [syncChats]);

    useEffect(() => {
        const changedDeps = Object.entries({ isAuthenticated, currentSpace })
            .filter(([key, value]) => prevDeps.current[key as keyof typeof prevDeps.current] !== value)
            .map(([key]) => key);

        if (changedDeps.length > 0) {
        } else {
        }
        prevDeps.current = { isAuthenticated, currentSpace };

        if (isOffline) {
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
                syncIntervalRef.current = null;
            }
            return;
        }

        if (isAuthenticated && currentSpace) {
            syncChatsRef.current();

            if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
            syncIntervalRef.current = setInterval(() => {
                syncChatsRef.current();
            }, 60 * 1000);

            const handleVisibilityChange = () => {
                if (document.visibilityState === 'visible') {
                    syncChatsRef.current();
                }
            };
            document.addEventListener('visibilitychange', handleVisibilityChange);

            return () => {
                if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
                document.removeEventListener('visibilitychange', handleVisibilityChange);
            };
        } else {
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
                syncIntervalRef.current = null;
            }
        }
    }, [isAuthenticated, currentSpace, isOffline]);

    const handleTriggerEdit = (index: number, content: string) => {
        setEditingMessageIndex(index);
        setEditingMessageContent(content);
        setShowEditDialog(true);
    };

    const handleRationaleSelectedForDistill = (rationale: ChatRationale) => {
        chatState.startDistillChat(rationale.id, rationale.title, rationale);
        setShowRationaleSelectionDialog(false);
    };
    const [mode, setMode] = useState<'chat' | 'create_rationale'>('chat');
    const [showGraph, setShowGraph] = useState(true);
    const [linkUrl, setLinkUrl] = useState('');
    const [canvasEnabled, setCanvasEnabled] = useState(false);
    const [rationaleGraph, setRationaleGraph] = useState<ViewpointGraph>({ nodes: [], edges: [] });

    useEffect(() => {
        const currentChatIdForEffect = chatList.currentChatId;
        console.log(`[AIAssistant] Chat Switch useEffect running. Current Chat ID: ${currentChatIdForEffect}`);
        const currentChat = chatList.savedChats.find(c => c.id === currentChatIdForEffect);
        console.log(`[AIAssistant] Found chat object:`, currentChat ? { id: currentChat.id, title: currentChat.title, graphExists: !!currentChat.graph } : 'None');

        if (currentChat) {
            // Simpler check: Mode is 'create_rationale' if graph property exists and is an object
            const isRationaleChat = currentChat.graph &&
                typeof currentChat.graph === 'object';
            // Removed check for nodes/edges length: (currentChat.graph.nodes?.length > 0 || currentChat.graph.edges?.length > 0);

            console.log(`[AIAssistant] Is rationale chat (based on graph object existence)? ${isRationaleChat}. Graph details:`, currentChat.graph);

            if (isRationaleChat) {
                console.log('[AIAssistant] Setting mode to create_rationale based on loaded chat.');
                setMode('create_rationale');
                setRationaleGraph(currentChat.graph || { nodes: [], edges: [] });
            } else {
                console.log('[AIAssistant] Setting mode to chat based on loaded chat.');
                setMode('chat');
                setRationaleGraph({ nodes: [], edges: [] });
            }
        } else {
            console.log('[AIAssistant] No current chat found, setting mode to chat.');
            setMode('chat');
            setRationaleGraph({ nodes: [], edges: [] });
        }
    }, [chatList.currentChatId, chatList.savedChats]);

    const handleRationaleGraphChange = useCallback((newGraph: ViewpointGraph) => {
        console.log(`[AIAssistant] handleRationaleGraphChange called. Graph has ${newGraph.nodes?.length || 0} nodes, ${newGraph.edges?.length || 0} edges.`);
        setRationaleGraph(newGraph);
        if (chatList.currentChatId && mode === 'create_rationale') {
            const currentChat = chatList.savedChats.find(c => c.id === chatList.currentChatId);
            const messages = currentChat?.messages || [];
            const title = currentChat?.title;
            const distillId = currentChat?.distillRationaleId;
            chatList.updateChat(chatList.currentChatId, messages, title, distillId, newGraph);
        }
    }, [chatList, mode]);

    const initialChatOptions: InitialOptionObject[] = [
        {
            id: 'distill',
            title: "Distill Rationale",
            prompt: "",
            description: "Select one of your rationales to generate an essay.",
        },
        {
            id: 'generate',
            title: "Suggest Points",
            prompt: "Help me brainstorm new points or suggest negations for my existing points based on the context you can see (existing points, owned points, endorsements).",
            description: "Get suggestions for new points or negations based on your context.",
        },
        {
            id: 'create_rationale',
            title: "Create Rationale",
            prompt: "Let's start building a new rationale. What topic are you focusing on?",
            description: "Use AI to help structure and generate a new rationale.",
            disabled: false,
            comingSoon: false,
        },
    ];

    const handleCloseRationaleCreator = () => {
        setMode('chat');
    };

    return (
        <div className="flex h-[calc(100vh-var(--header-height))] bg-background">
            {isMobile && showMobileMenu && (
                <div
                    className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
                    onClick={() => setShowMobileMenu(false)}
                    aria-hidden="true"
                />
            )}
            <ChatSidebar
                isMobile={isMobile}
                showMobileMenu={showMobileMenu}
                isInitializing={isInitializing}
                isAuthenticated={isAuthenticated}
                savedChats={chatList.savedChats}
                currentChatId={chatList.currentChatId}
                currentSpace={currentSpace}
                generatingTitles={chatState.generatingTitles}
                onSwitchChat={chatList.switchChat}
                onNewChat={handleCreateNewChat}
                onTriggerDeleteAll={handleTriggerDeleteAll}
                onTriggerRename={handleTriggerRename}
                onTriggerDelete={handleTriggerDelete}
                onCloseMobileMenu={() => setShowMobileMenu(false)}
            />

            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                <ChatHeader
                    isMobile={isMobile}
                    isAuthenticated={isAuthenticated}
                    isInitializing={isInitializing}
                    currentSpace={currentSpace}
                    isSyncing={isSyncing}
                    syncActivity={syncActivity}
                    lastSyncTime={lastSyncTime}
                    lastSyncStats={lastSyncStats}
                    syncError={syncError}
                    discourse={discourse}
                    isNonGlobalSpace={isNonGlobalSpace}
                    isGenerating={chatState.generatingChats.has(chatList.currentChatId || "")}
                    onShowMobileMenu={() => setShowMobileMenu(true)}
                    onBack={() => handleBackNavigation(router, setInitialTab)}
                    onTriggerSync={syncChatsRef.current}
                    isPulling={syncActivity === 'pulling'}
                    isSaving={syncActivity === 'saving'}
                    isOffline={isOffline}
                    mode={mode}
                    showGraph={showGraph}
                    setShowGraph={setShowGraph}
                    linkUrl={linkUrl}
                    setLinkUrl={setLinkUrl}
                    onCloseRationaleCreator={handleCloseRationaleCreator}
                    canvasEnabled={canvasEnabled}
                    setCanvasEnabled={setCanvasEnabled}
                />

                {mode === 'chat' ? (
                    <>
                        <ChatMessageArea
                            isInitializing={isInitializing}
                            isFetchingRationales={isFetchingRationales}
                            chatState={chatState}
                            isGeneratingCurrent={chatState.generatingChats.has(chatList.currentChatId || "")}
                            isFetchingCurrentContext={chatState.fetchingContextChats.has(chatList.currentChatId || "")}
                            currentStreamingContent={chatState.streamingContents.get(chatList.currentChatId || "") || ""}
                            chatList={chatList}
                            discourse={discourse}
                            isAuthenticated={isAuthenticated}
                            userRationales={userRationales}
                            availableRationales={availableRationales}
                            currentSpace={currentSpace}
                            isMobile={isMobile}
                            initialOptions={initialChatOptions}
                            onStartChatOption={handleStartChatOption}
                            onTriggerEdit={handleTriggerEdit}
                        />
                        <ChatInputForm
                            message={chatState.message}
                            setMessage={chatState.setMessage}
                            isGenerating={chatState.generatingChats.has(chatList.currentChatId || "")}
                            isAuthenticated={isAuthenticated}
                            isInitializing={isInitializing}
                            isMobile={isMobile}
                            currentSpace={currentSpace}
                            onSubmit={handleFormSubmit}
                            onKeyDown={handleKeyDown}
                            onShowSettings={() => setShowSettingsDialog(true)}
                        />
                    </>
                ) : (
                    <RationaleCreator
                        onClose={handleCloseRationaleCreator}
                        chatState={chatState}
                        chatList={chatList}
                        discourse={discourse}
                        isAuthenticated={isAuthenticated}
                        isInitializing={isInitializing}
                        currentSpace={currentSpace}
                        isMobile={isMobile}
                        showGraph={showGraph}
                        initialGraph={rationaleGraph}
                        onGraphChange={handleRationaleGraphChange}
                        canvasEnabled={canvasEnabled}
                    />
                )}
            </div>

            <RationaleSelectionDialog
                isOpen={showRationaleSelectionDialog}
                onOpenChange={setShowRationaleSelectionDialog}
                rationales={availableRationales}
                onRationaleSelected={handleRationaleSelectedForDistill}
                currentUserId={privyUser?.id}
            />

            {isNonGlobalSpace && (
                <>
                    <DiscourseConnectDialog
                        isOpen={discourse.showDiscourseDialog}
                        onOpenChange={discourse.setShowDiscourseDialog}
                        isMobile={isMobile}
                        connectionStatus={discourse.connectionStatus}
                        discourseUsername={discourse.discourseUsername}
                        setDiscourseUsername={discourse.setDiscourseUsername}
                        storedMessages={discourse.storedMessages}
                        isConnectingToDiscourse={discourse.isConnectingToDiscourse}
                        fetchProgress={discourse.fetchProgress}
                        error={discourse.error}
                        handleConnect={discourse.handleConnectToDiscourse}
                        handleViewMessages={discourse.handleViewMessages}
                        handleDeleteMessages={discourse.handleDeleteMessages}
                    />
                    <DiscourseMessagesDialog
                        isOpen={discourse.showMessagesModal}
                        onOpenChange={discourse.setShowMessagesModal}
                        messages={discourse.storedMessages}
                    />
                    <DiscourseConsentDialog
                        isOpen={discourse.showConsentDialog}
                        onOpenChange={discourse.setShowConsentDialog}
                        onConfirm={discourse.handleConsentAndConnect}
                        isLoading={discourse.isUpdatingConsent}
                    />
                </>
            )}

            <ChatSettingsDialog
                isOpen={showSettingsDialog}
                onOpenChange={setShowSettingsDialog}
                settings={settings}
                setSettings={setSettings}
                isNonGlobalSpace={isNonGlobalSpace}
                isAuthenticated={isAuthenticated}
            />

            <AlertDialog open={!!chatList.chatToDelete} onOpenChange={(open) => !open && chatList.setChatToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="break-words">Delete Chat</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this chat ({chatList.savedChats.find(c => c.id === chatList.chatToDelete)?.title || ''})? ...
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AuthenticatedActionButton onClick={() => { if (chatList.chatToDelete) chatList.deleteChat(chatList.chatToDelete); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AuthenticatedActionButton>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={chatList.chatToRename !== null} onOpenChange={(open) => !open && chatList.setChatToRename(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Rename Chat</DialogTitle></DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); if (chatList.chatToRename) chatList.renameChat(chatList.chatToRename, chatList.newChatTitle); }}>
                        <div className="grid gap-4 py-4">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="name" className="text-sm">Chat Name</Label>
                                <Input id="name" value={chatList.newChatTitle} onChange={(e) => chatList.setNewChatTitle(e.target.value)} placeholder="Enter new chat name" autoComplete="off" />
                            </div>
                        </div>
                        <div className="flex items-center justify-end space-x-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => chatList.setChatToRename(null)}>Cancel</Button>
                            <AuthenticatedActionButton type="submit" disabled={!chatList.newChatTitle.trim()}>Save</AuthenticatedActionButton>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={chatList.showDeleteAllConfirmation} onOpenChange={chatList.setShowDeleteAllConfirmation}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="break-words">Delete All Chats?</AlertDialogTitle>
                        <AlertDialogDescription>Are you sure you want to delete all {chatList.savedChats.length} chats in the &apos;{currentSpace}&apos; space? ...</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AuthenticatedActionButton onClick={chatList.deleteAllChats} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete All</AuthenticatedActionButton>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={showEditDialog} onOpenChange={(open) => {
                if (!open) {
                    setShowEditDialog(false);
                    setEditingMessageIndex(null);
                    setEditingMessageContent("");
                }
            }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Edit Message</DialogTitle></DialogHeader>
                    <div className="py-4">
                        <AutosizeTextarea
                            value={editingMessageContent}
                            onChange={(e) => setEditingMessageContent(e.target.value)}
                            placeholder="Edit your message..."
                            className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            minHeight={100}
                            maxHeight={300}
                            autoFocus
                        />
                    </div>
                    <div className="flex items-center justify-end space-x-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
                        <AuthenticatedActionButton
                            onClick={() => {
                                if (editingMessageIndex !== null) {
                                    chatState.handleSaveEdit(editingMessageIndex, editingMessageContent);
                                    setShowEditDialog(false);
                                    setEditingMessageIndex(null);
                                    setEditingMessageContent("");
                                }
                            }}
                            disabled={!editingMessageContent.trim()}
                        >
                            Save Changes
                        </AuthenticatedActionButton>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
} 