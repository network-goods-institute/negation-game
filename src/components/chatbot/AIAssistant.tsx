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
import { handleBackNavigation } from '@/lib/backButtonUtils';
import { ChatRationale, ChatSettings, SavedChat, ChatMessage } from '@/types/chat';
import { useDiscourseIntegration } from "@/hooks/useDiscourseIntegration";
import { useChatListManagement } from "@/hooks/useChatListManagement";
import { useChatState } from "@/hooks/useChatState";
import { ChatSidebar } from './ChatSidebar';
import { computeChatStateHash } from "@/lib/chatUtils";
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

type OwnedPoint = ProfilePoint;

export type InitialOptionObject = {
    id: 'distill' | 'build' | 'generate';
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
                try { return JSON.parse(savedSettings); } catch (e) { console.error('Error parsing settings:', e); }
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
            console.log(`[Background Stat] Create success: ${chatId}`);
            backgroundStatsRef.current.creates++;
        },
        onBackgroundCreateError: (chatId, error) => {
            console.log(`[Background Stat] Create error: ${chatId}`, error);
            backgroundStatsRef.current.errors++;
        },
        onBackgroundUpdateSuccess: (chatId) => {
            console.log(`[Background Stat] Update success: ${chatId}`);
            backgroundStatsRef.current.updates++;
        },
        onBackgroundUpdateError: (chatId, error) => {
            console.log(`[Background Stat] Update error: ${chatId}`, error);
            backgroundStatsRef.current.errors++;
        },
        onBackgroundDeleteSuccess: (chatId) => {
            console.log(`[Background Stat] Delete success: ${chatId}`);
            backgroundStatsRef.current.deletes++;
        },
        onBackgroundDeleteError: (chatId, error) => {
            console.log(`[Background Stat] Delete error: ${chatId}`, error);
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
        console.log(`[handleImportChat] Called for ID: ${importChatId}`);

        let toastId = toast.loading("Importing chat...");
        let importSuccess = false;

        try {
            const sharedContent = await fetchSharedChatContent(importChatId);
            if (!sharedContent) {
                throw new Error("Failed to fetch shared content");
            }
            console.log(`[handleImportChat] Fetched content for ${importChatId}. Creating new chat...`);

            const newChatId = await chatList.createNewChat();
            if (!newChatId || typeof newChatId !== 'string') {
                throw new Error("Failed to create new chat");
            }
            console.log(`[handleImportChat] Created chat ${newChatId}, updating with content...`);

            await chatList.updateChat(
                newChatId,
                sharedContent.messages,
                `Imported: ${sharedContent.title}`.substring(0, 100)
            );
            console.log(`[handleImportChat] Successfully imported chat ${importChatId} as ${newChatId}`);
            toast.success("Chat imported successfully!", { id: toastId });
            importSuccess = true;

        } catch (error) {
            console.error("[handleImportChat] Error:", error);
            toast.error(
                error instanceof Error ? error.message : "Failed to import chat",
                { id: toastId }
            );
        } finally {
            console.log("[handleImportChat Cleanup] Entered finally block.");
            importStatusRef.current = { importing: false, importId: null };
            console.log("[handleImportChat Cleanup] Import status ref cleared.");

            if (importSuccess) {
                console.log("[handleImportChat Cleanup] Import was successful. Proceeding with URL cleanup.");
                try {
                    const currentUrl = new URL(window.location.href);
                    if (currentUrl.searchParams.has('importChat')) {
                        // eslint-disable-next-line drizzle/enforce-delete-with-where
                        currentUrl.searchParams.delete('importChat');
                        const newUrl = currentUrl.pathname + currentUrl.search;
                        console.log(`[handleImportChat Cleanup] Cleaning URL. Old: ${window.location.href}, New: ${newUrl}`);
                        router.push(newUrl, { scroll: false });
                        console.log("[handleImportChat Cleanup] router.push called for successful import.");
                    } else {
                        console.log("[handleImportChat Cleanup] Success, but importChat param already removed?");
                    }
                } catch (e) {
                    console.error("[handleImportChat Cleanup] Error cleaning URL after success:", e);
                }
            } else {
                console.log("[handleImportChat Cleanup] Import failed. Skipping URL cleanup.");
                if (router && currentSpace) {
                    try {
                        const currentUrl = new URL(window.location.href);
                        if (currentUrl.searchParams.has('importChat')) {
                            // eslint-disable-next-line drizzle/enforce-delete-with-where
                            currentUrl.searchParams.delete('importChat');
                            const newUrl = currentUrl.pathname + currentUrl.search;
                            console.log("[handleImportChat Cleanup] Cleaning URL after failure.");
                            router.push(newUrl, { scroll: false });
                        }
                    } catch (e) { /* Ignore cleanup error on fail */ }
                }
            }
            console.log("[handleImportChat Cleanup] Exiting finally block.");
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
            console.log(`[Import Trigger Effect] Import ID ${importChatId} already processed this session. Skipping.`);
            try {
                const currentUrl = new URL(window.location.href);
                if (currentUrl.searchParams.has('importChat')) {
                    currentUrl.searchParams.delete('importChat');
                    const newUrl = currentUrl.pathname + currentUrl.search;
                    router.push(newUrl, { scroll: false });
                }
            } catch (e) {/* Ignore error */ }
            return;
        }

        if (!isAuthenticated || !isChatListInitialized || isInitializing || isFetchingRationales) {
            console.log(`[Import Trigger Effect] Waiting for initialization... Auth: ${isAuthenticated}, ChatList: ${isChatListInitialized}, Init: ${!isInitializing}, FetchingRationales: ${isFetchingRationales}`);
            return;
        }

        if (importStatusRef.current.importing) {
            if (importStatusRef.current.importId === importChatId) {
                console.log(`[Import Trigger Effect] Import already in progress for ${importChatId} (Effect Guard).`);
            } else {
                console.warn(`[Import Trigger Effect] Effect triggered for ${importChatId} while import for ${importStatusRef.current.importId} is in progress. Aborting new trigger.`);
            }
            return;
        }

        console.log(`[Import Trigger Effect] Conditions met. Preparing to import ${importChatId}.`);

        try {
            const currentUrl = new URL(window.location.href);
            if (currentUrl.searchParams.has('importChat')) {
                currentUrl.searchParams.delete('importChat');
                const newUrl = currentUrl.pathname + currentUrl.search;
                console.log(`[Import Trigger Effect] Clearing URL parameter immediately. New target URL: ${newUrl}`);
                router.push(newUrl, { scroll: false });
            } else {
                console.log(`[Import Trigger Effect] URL parameter already cleared? Skipping router.push.`);
            }
        } catch (e) {
            console.error("[Import Trigger Effect] Error clearing URL parameter proactively:", e);
        }

        console.log(`[Import Trigger Effect] Setting import guard and calling handleImportChat for ${importChatId}`);
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
                        console.error('Error fetching rationales:', rationaleError);
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
                            author: String(r.author || 'Unknown Author'),
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
                console.error('Error initializing:', error);
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
    const handleStartChatOption = (option: InitialOptionObject) => {
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
        console.log(`[Sync Triggered] State Check: isAuthenticated=${isAuthenticated}, currentSpace=${currentSpace}, isSyncing=${isSyncing}`);

        if (!isAuthenticated || !currentSpace) {
            console.log("[Sync] Skipping: Not authenticated or no space.");
            return;
        }

        setIsSyncing(true);
        console.log("[Sync] Set isSyncing = true");

        const currentPendingPushIds = chatList.pendingPushIds;
        if (currentPendingPushIds.size > 0) {
            console.log(`[Sync] Info: Detected ${currentPendingPushIds.size} pending push operations. Sync will proceed cautiously.`);
        }

        console.log("[Sync] Starting sync process...");
        const maxRetries = 2;
        const initialDelay = 2000;

        const attemptSync = async (retryCount: number) => {
            console.log(`[Sync Attempt] Starting attempt ${retryCount + 1}/${maxRetries + 1}`);
            setSyncError(null);
            setSyncActivity('checking');

            const bgStats = { ...backgroundStatsRef.current };
            backgroundStatsRef.current = { creates: 0, updates: 0, deletes: 0, errors: 0 };
            console.log("[Sync] Background stats captured and reset:", bgStats);

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

                console.log("[Sync] Fetching server metadata...");
                const serverMetadata: ChatMetadata[] = await fetchUserChatMetadata(currentSpace);
                console.log(`[Sync] Found ${serverMetadata.length} chats on server.`);

                let localChats: SavedChat[] = [];
                const localDataString = localStorage.getItem(`saved_chats_${currentSpace}`);
                if (localDataString) {
                    try {
                        localChats = (JSON.parse(localDataString) as SavedChat[]).map(c => ({ ...c, state_hash: c.state_hash || "" }));
                    } catch (e) {
                        console.error("[Sync] Error parsing local chats from storage:", e);
                        localChats = [];
                    }
                }
                console.log(`[Sync] Found ${localChats.length} chats locally for comparison.`);

                const serverMap = new Map(serverMetadata.map(m => [m.id, m]));
                const localMap = new Map(localChats.map(c => [c.id, c]));
                const promisesToAwait: Promise<any>[] = [];
                const chatsToUpdateLocally: SavedChat[] = [];
                const chatsToDeleteLocally: string[] = [];
                const chatsToPush: SavedChat[] = [];

                console.log("[Sync] Pass 1: Checking server chats against local...");
                for (const serverChat of serverMetadata) {
                    const localChat = localMap.get(serverChat.id);

                    if (chatState.generatingChats.has(serverChat.id)) {
                        console.log(`[Sync] Skipping pull check for active generating chat ${serverChat.id}`);
                        continue;
                    }

                    if (currentPendingPushIds.has(serverChat.id)) {
                        console.log(`[Sync] Skipping PULL check for chat ${serverChat.id} as a local push is pending.`);
                        continue;
                    }

                    if (!localChat) {
                        console.log(`[Sync] Action: PULL needed for server chat ${serverChat.id} (not found locally).`);
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
                                    console.warn(`[Sync] Content for pulled chat ${serverChat.id} was null.`);
                                    currentStats.errors++;
                                }
                            } catch (e) { console.error(`[Sync] Error pulling chat ${serverChat.id}:`, e); currentStats.errors++; throw e; }
                        })());
                    } else {
                        const localHash = localChat.state_hash || await computeChatStateHash(localChat.title, localChat.messages);
                        const localUpdatedAt = new Date(localChat.updatedAt).getTime();
                        const serverUpdatedAt = serverChat.updatedAt.getTime();

                        if (serverChat.state_hash !== localHash && serverUpdatedAt > localUpdatedAt) {
                            if (currentPendingPushIds.has(serverChat.id)) {
                                console.log(`[Sync] Skipping PULL (overwrite case) for chat ${serverChat.id} as a local push is pending.`);
                                continue;
                            }
                            console.log(`[Sync] Action: PULL needed for chat ${serverChat.id} (server newer & hash mismatch).`);
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
                                    } else { console.warn(`[Sync] Content for pulled chat ${serverChat.id} was null (overwrite case).`); currentStats.errors++; }
                                } catch (e) { console.error(`[Sync] Error pulling chat ${serverChat.id} (overwrite case):`, e); currentStats.errors++; throw e; }
                            })());
                        }
                    }
                }

                console.log("[Sync] Pass 2: Checking local chats against server...");
                for (const localChat of localChats) {
                    const serverChat = serverMap.get(localChat.id);
                    if (!serverChat) {
                        if (currentPendingPushIds.has(localChat.id)) {
                            console.log(`[Sync] Action: Skipping DELETE LOCAL for chat ${localChat.id} as a push operation is pending.`);
                            continue;
                        }

                        const creationTime = new Date(localChat.createdAt).getTime();
                        const now = Date.now();
                        const ageInMs = now - creationTime;
                        const RECENT_THRESHOLD_MS = 30000;

                        if (ageInMs < RECENT_THRESHOLD_MS) {
                            console.log(
                                `[Sync] Action: Skipping DELETE LOCAL for recently created chat ${localChat.id} (age: ${Math.round(ageInMs / 1000)}s). Assuming server create is pending.`
                            );
                            continue;
                        } else {
                            console.log(
                                `[Sync] Action: DELETE LOCAL needed for chat ${localChat.id} (not found on server, age: ${Math.round(ageInMs / 1000)}s > threshold).`
                            );
                            chatsToDeleteLocally.push(localChat.id);
                        }
                    } else {
                        if (chatState.generatingChats.has(localChat.id)) {
                            console.log(`[Sync] Skipping push check for active generating chat ${localChat.id}`);
                            continue;
                        }

                        if (currentPendingPushIds.has(localChat.id)) {
                            console.log(`[Sync] Skipping PUSH check for chat ${localChat.id} as a local push is already pending.`);
                            continue;
                        }

                        const localHash =
                            localChat.state_hash ||
                            (await computeChatStateHash(localChat.title, localChat.messages));
                        const localUpdatedAt = new Date(localChat.updatedAt).getTime();
                        const serverUpdatedAt = serverChat.updatedAt.getTime();

                        if (serverChat.state_hash !== localHash && localUpdatedAt > serverUpdatedAt) {
                            console.log(`[Sync] Action: PUSH UPDATE needed for chat ${localChat.id} (local newer & hash mismatch).`);
                            chatsToPush.push(localChat);
                        }
                    }
                }

                if (promisesToAwait.length > 0 || chatsToPush.length > 0) {
                    console.log(`[Sync] Executing ${promisesToAwait.length} pulls and ${chatsToPush.length} pushes...`);

                    chatsToPush.forEach(localChat => {
                        if (currentPendingPushIds.has(localChat.id)) {
                            console.log(`[Sync] Skipping PUSH execution for ${localChat.id} from sync cycle as a local push is pending.`);
                            return;
                        }

                        if (!activitySet) { setSyncActivity('saving'); activitySet = true; }
                        currentStats.pushedUpdates++;
                        promisesToAwait.push(updateDbChat(localChat).catch(e => {
                            console.error(`[Sync] Error pushing update for ${localChat.id} from sync cycle`, e);
                            currentStats.errors++;
                            throw e;
                        }));
                    });

                    const results = await Promise.allSettled(promisesToAwait);
                    console.log("[Sync] Network operations settled.");

                    if (results.some(result => result.status === 'rejected')) {
                        results.forEach(result => {
                            if (result.status === 'rejected') {
                                console.error("[Sync] Operation failed:", result.reason);
                            }
                        });
                        throw new Error("One or more sync operations failed.");
                    }
                } else {
                    console.log("[Sync] No network operations needed for this attempt.");
                }

                console.log(`[Sync] Applying local updates: ${chatsToUpdateLocally.length} updates, ${chatsToDeleteLocally.length} deletions.`);
                chatsToUpdateLocally.forEach(chat => {
                    if (currentPendingPushIds.has(chat.id)) {
                        console.warn(`[Sync] Suppressing local update for chat ${chat.id} due to pending push operation.`);
                        return;
                    }
                    chatList.replaceChat(chat.id, chat);
                });
                chatsToDeleteLocally.forEach(id => {
                    if (currentPendingPushIds.has(id)) {
                        console.warn(`[Sync] Suppressing local delete for chat ${id} due to pending push operation.`);
                        return;
                    }
                    try {
                        chatList.deleteChatLocally(id);
                    } catch (e) {
                        console.error(`[Sync] Error deleting chat locally ${id} after sync:`, e);
                        currentStats.errors++;
                    }
                });

                console.log(`[Sync Success] Attempt ${retryCount + 1} successful. Final Stats:`, currentStats);
                setLastSyncTime(Date.now());
                setLastSyncStats(currentStats);
                setSyncError(null);
                setSyncActivity('idle');
                setIsOffline(false);

            } catch (error) {
                console.error(`[Sync Error] Attempt ${retryCount + 1} failed:`, error);
                const message = error instanceof Error ? error.message : "An unknown error occurred during sync";

                const isNetworkError = error instanceof TypeError && message.includes('Failed to fetch');

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
                        console.log(`[Sync Retry] Will retry in ${delay / 1000}s...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        await attemptSync(retryCount + 1);
                        return;
                    } else {
                        console.error("[Sync Failed] Max retries reached. Sync failed permanently for this cycle.");
                        toast.error(`Chat sync failed: ${message.substring(0, 100)}`);
                        setLastSyncStats(null);
                    }
                }
            } finally {
                console.log("[Sync] Sync process finished (or aborted). Setting isSyncing = false");
                setIsSyncing(false);
            }
        };

        try {
            await attemptSync(0);
        } finally {
            console.log("[Sync] Sync process finished (or aborted). Setting isSyncing = false");
        }

    }, [isAuthenticated, currentSpace, chatList, isSyncing, chatState.generatingChats, isOffline]);

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
            console.log(`[Sync Setup] useEffect triggered by changes in: ${changedDeps.join(', ')}`, { isAuthenticated, currentSpace });
        } else {
            console.log(`[Sync Setup] useEffect triggered without apparent dependency change (might be syncChats identity).`, { isAuthenticated, currentSpace });
        }
        prevDeps.current = { isAuthenticated, currentSpace };

        if (isOffline) {
            console.log("[Sync Setup] Paused: Currently offline.");
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
                syncIntervalRef.current = null;
                console.log("[Sync Setup] Cleared existing sync interval due to offline status.");
            }
            return;
        }

        if (isAuthenticated && currentSpace) {
            console.log("[Sync Setup] Conditions met (authenticated and space exists). Setting up sync interval and listener.");
            console.log("[Sync] Triggering initial sync via ref.");
            syncChatsRef.current();

            if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
            syncIntervalRef.current = setInterval(() => {
                console.log("[Sync Interval] Firing sync via ref...");
                syncChatsRef.current();
            }, 60 * 1000);

            const handleVisibilityChange = () => {
                if (document.visibilityState === 'visible') {
                    console.log("[Sync Visibility] Triggering sync on focus via ref.");
                    syncChatsRef.current();
                }
            };
            document.addEventListener('visibilitychange', handleVisibilityChange);

            return () => {
                console.log("[Sync Setup] Cleanup: Clearing interval and removing listener.");
                if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
                document.removeEventListener('visibilitychange', handleVisibilityChange);
            };
        } else {
            console.log("[Sync Setup] Conditions not met (not authenticated or no space). Skipping setup.");
            if (syncIntervalRef.current) {
                console.log("[Sync Setup] Cleanup: Conditions no longer met, clearing interval.");
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

    const [loadingChat, setLoadingChat] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFetchChatContent = async (selectedChatId: string) => {
        if (!selectedChatId) return;

        console.log(`[AIAssistant:fetchChatContent] Fetching content for chat ID: ${selectedChatId}`);
        setLoadingChat(true);
        setError(null);
        try {
            const content = await fetchChatContent(selectedChatId);
            if (content) {
                console.log(`[AIAssistant:fetchChatContent] Successfully fetched content for ${selectedChatId}`, content);
                const mappedMessages: ChatMessage[] = content.messages.map((msg: any) => ({
                    role: msg.role,
                    content: msg.content,
                    sources: msg.sources,
                    error: undefined,
                }));
                chatState.setChatMessages(mappedMessages);
            } else {
                console.warn(`[AIAssistant:fetchChatContent] No content found for chat ${selectedChatId}.`);
                setError("No content found for the selected chat.");
            }
        } catch (e) {
            console.error(`[AIAssistant:fetchChatContent] Error fetching content for chat ${selectedChatId}:`, e);
            setError("An error occurred while fetching the chat content.");
        } finally {
            setLoadingChat(false);
        }
    };

    const handleRationaleSelectedForDistill = (rationale: ChatRationale) => {
        console.log(`[AIAssistant] Rationale selected for distillation:`, rationale);
        chatState.startDistillChat(rationale.id, rationale.title, rationale);
        setShowRationaleSelectionDialog(false);
    };

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
            id: 'build',
            title: "Build from Posts",
            prompt: "I'd like to build a new rationale from my forum posts and our discussion. Please help me organize my thoughts based on my forum posts and my points.",
            description: "Create rationales from your forum posts.",
            disabled: true,
            comingSoon: true,
        },
    ];

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
                    onShowMobileMenu={() => setShowMobileMenu(true)}
                    onBack={() => handleBackNavigation(router, setInitialTab)}
                    onTriggerSync={syncChatsRef.current}
                    isPulling={syncActivity === 'pulling'}
                    isSaving={syncActivity === 'saving'}
                    isGenerating={chatState.generatingChats.has(chatList.currentChatId || "")}
                    isOffline={isOffline}
                />

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
            </div>

            <RationaleSelectionDialog
                isOpen={showRationaleSelectionDialog}
                onOpenChange={setShowRationaleSelectionDialog}
                rationales={availableRationales}
                onRationaleSelected={handleRationaleSelectedForDistill}
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