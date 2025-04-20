"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    Loader2,
    ArrowLeft,
    CircleIcon,
    CircleDotIcon,
    Menu,
    SlidersHorizontal,
    RefreshCw
} from "lucide-react";
import { useUser } from "@/queries/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { EndorsedPoint } from "@/actions/generateChatBotResponse";
import { nanoid } from "nanoid";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MemoizedMarkdown } from "@/components/ui/MemoizedMarkdown";
import { AuthenticatedActionButton } from "@/components/ui/AuthenticatedActionButton";
import { fetchUserEndorsedPoints } from "@/actions/fetchUserEndorsedPoints";
import { getSpace } from "@/actions/getSpace";
import { Skeleton } from "../ui/skeleton";
import { AutosizeTextarea } from "../ui/autosize-textarea";
import { fetchUserViewpoints } from "@/actions/fetchUserViewpoints";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

import { DiscourseConnectDialog } from "@/components/chatbot/DiscourseConnectDialog";
import { DiscourseMessagesDialog } from "@/components/chatbot/DiscourseMessagesDialog";
import { DiscourseConsentDialog } from "@/components/chatbot/DiscourseConsentDialog";
import { ChatSettingsDialog } from "@/components/chatbot/ChatSettingsDialog";
import { DetailedSourceList } from './DetailedSourceList';
import { useSetAtom } from 'jotai';
import { initialSpaceTabAtom } from '@/atoms/navigationAtom';
import { handleBackNavigation } from '@/utils/backButtonUtils';
import { ChatRationale, ChatSettings, InitialOption, SavedChat } from '@/types/chat';
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const ChatLoadingState = () => {
    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-muted/30">
            <div className="p-6 space-y-6">
                <div className="flex flex-col space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <div className="flex justify-end space-y-2">
                    <div className="w-1/2">
                        <Skeleton className="h-24 w-full rounded-xl" />
                    </div>
                </div>
                <div className="flex flex-col space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-80" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <div className="flex justify-end space-y-2">
                    <div className="w-1/2">
                        <Skeleton className="h-16 w-full rounded-xl" />
                    </div>
                </div>
            </div>
        </div>
    );
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
    const [endorsedPoints, setEndorsedPoints] = useState<EndorsedPoint[]>([]);
    const [userRationales, setUserRationales] = useState<ChatRationale[]>([]);
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

    const [isSyncing, setIsSyncing] = useState(false);
    const [syncActivity, setSyncActivity] = useState<'idle' | 'checking' | 'pulling' | 'saving' | 'error'>('idle');
    const [isPulling, setIsPulling] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
    const [lastSyncStats, setLastSyncStats] = useState<SyncStats | null>(null);
    const [syncError, setSyncError] = useState<string | null>(null);
    const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const isNonGlobalSpace = currentSpace !== null && currentSpace !== 'global';

    const chatList = useChatListManagement({ currentSpace, isAuthenticated });
    const { isInitialized: isChatListInitialized } = chatList;
    const discourse = useDiscourseIntegration({ userData, isAuthenticated, isNonGlobalSpace, currentSpace, privyUserId: privyUser?.id });
    const chatState = useChatState({ currentChatId: chatList.currentChatId, currentSpace, isAuthenticated, settings, endorsedPoints, userRationales, storedMessages: discourse.storedMessages, savedChats: chatList.savedChats, updateChat: chatList.updateChat, createNewChat: chatList.createNewChat as unknown as () => Promise<string | null> });

    useEffect(() => {
        const importChatId = searchParams.get('importChat');

        if (!isChatListInitialized || !importChatId || !isAuthenticated || !currentSpace || !router || !chatList.updateChat) {
            return;
        }

        console.log(`[Chat Import] Initialized. Detected importChat query param: ${importChatId}`);

        const alreadyExists = chatList.savedChats.some(chat =>
            chat.title.includes(`Imported:`) &&
            chat.messages[0]?.content.includes(importChatId)
        );

        if (alreadyExists) {
            console.log(`[Chat Import] Chat ${importChatId} appears to be already imported.`);
            toast("Chat already imported.");
            router.replace(`/s/${currentSpace}/chat`);
            return;
        }

        const importAndSaveChat = async () => {
            let toastId = toast.loading("Importing chat...");
            try {
                const sharedContent = await fetchSharedChatContent(importChatId);

                if (sharedContent) {
                    console.log(`[Chat Import] Fetched content for ${importChatId}, attempting to save via updateChat.`);
                    const newChatId = nanoid();
                    await chatList.updateChat(
                        newChatId,
                        sharedContent.messages,
                        `Imported: ${sharedContent.title}`.substring(0, 100)
                    );
                    toast.dismiss(toastId);
                } else {
                    console.error(`[Chat Import] Failed to fetch content for ${importChatId}.`);
                    toast.error("Failed to import chat. Link may be invalid or chat not shared.", { id: toastId });
                }
            } catch (error) {
                console.error("[Chat Import] Error during import process:", error);
                toast.error("An error occurred during chat import.", { id: toastId });
            } finally {
                router.replace(`/s/${currentSpace}/chat`);
            }
        };

        importAndSaveChat();
    }, [searchParams, isChatListInitialized, isAuthenticated, currentSpace, router, chatList.updateChat]);

    useEffect(() => {
        const initializeAssistant = async () => {
            setIsInitializing(true);
            try {
                const space = await getSpace();
                setCurrentSpace(space);
                if (isAuthenticated) {
                    const [points, rationalesResult] = await Promise.all([
                        fetchUserEndorsedPoints(),
                        fetchUserViewpoints()
                    ]);
                    setEndorsedPoints(points || []);
                    const convertedRationales: ChatRationale[] = (rationalesResult || []).map((r: any): ChatRationale => {
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
                } else {
                    setEndorsedPoints([]);
                    setUserRationales([]);
                }
            } catch (error) {
                console.error('Error initializing:', error);
                setCurrentSpace('global');
                setEndorsedPoints([]);
                setUserRationales([]);
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
    const handleStartChatOption = (option: InitialOption) => {
        chatState.startChatWithOption(option);
        setShowMobileMenu(false);
    };
    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        chatState.handleSubmit(e);
    };
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            chatState.handleSubmit(e);
        }
    };

    const syncChats = useCallback(async () => {
        if (!isAuthenticated || !currentSpace) {
            console.log("[Sync] Skipping: Not authenticated or no space.");
            return;
        }
        if (isSyncing) {
            console.log("[Sync] Skipping: Already in progress.");
            return;
        }

        console.log("[Sync] Starting sync process...");
        const maxRetries = 2;
        const initialDelay = 2000;

        const attemptSync = async (retryCount: number) => {
            console.log(`[Sync Attempt] Starting attempt ${retryCount + 1}/${maxRetries + 1}`);
            setSyncError(null);
            setSyncActivity('checking');
            let currentStats: SyncStats = { pulled: 0, pushedUpdates: 0, pushedCreates: 0, errors: 0 };
            let activitySet = false;

            try {
                if (retryCount === 0) {
                    setIsSyncing(true);
                }
                setSyncActivity('pulling');
                activitySet = true;

                console.log("[Sync] Fetching server metadata...");
                const serverMetadata: ChatMetadata[] = await fetchUserChatMetadata();
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
                        console.log(`[Sync] Action: DELETE LOCALLY chat ${localChat.id} (not found in active server metadata).`);
                        chatsToDeleteLocally.push(localChat.id);
                    } else {
                        const localHash = localChat.state_hash || await computeChatStateHash(localChat.title, localChat.messages);
                        const localUpdatedAt = new Date(localChat.updatedAt).getTime();
                        const serverUpdatedAt = serverChat.updatedAt.getTime();
                        if (serverChat.state_hash !== localHash && localUpdatedAt > serverUpdatedAt) {
                            console.log(`[Sync] Action: PUSH UPDATE needed for chat ${localChat.id} (local newer & hash mismatch).`);
                            if (!activitySet) { setSyncActivity('saving'); activitySet = true; }
                            currentStats.pushedUpdates++;
                            chatsToPush.push(localChat);
                        }
                    }
                }

                if (promisesToAwait.length > 0 || chatsToPush.length > 0) {
                    console.log(`[Sync] Executing ${promisesToAwait.length} pulls and ${chatsToPush.length} pushes...`);

                    chatsToPush.forEach(localChat => {
                        promisesToAwait.push(updateDbChat(localChat).catch(e => {
                            console.error(`[Sync] Error pushing update for ${localChat.id}`, e);
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
                    chatList.replaceChat(chat.id, chat);
                });
                chatsToDeleteLocally.forEach(id => {
                    try {
                        chatList.deleteChatLocally(id);
                    } catch (e) {
                        console.error(`[Sync] Error deleting chat locally ${id} after sync:`, e);
                        currentStats.errors++;
                    }
                });

                console.log(`[Sync Success] Attempt ${retryCount + 1} successful.`);
                setLastSyncTime(Date.now());
                setLastSyncStats(currentStats);
                setSyncError(null);
                setSyncActivity('idle');
                setIsSyncing(false);

            } catch (error) {
                console.error(`[Sync Error] Attempt ${retryCount + 1} failed:`, error);
                const message = error instanceof Error ? error.message : "An unknown error occurred during sync";
                setSyncError(message);
                setSyncActivity('error');

                if (retryCount < maxRetries) {
                    const delay = initialDelay * Math.pow(2, retryCount);
                    console.log(`[Sync Retry] Will retry in ${delay / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    await attemptSync(retryCount + 1);
                } else {
                    console.error("[Sync Failed] Max retries reached. Sync failed permanently for this cycle.");
                    toast.error(`Chat sync failed: ${message.substring(0, 100)}`);
                    setLastSyncStats(null);
                    setIsSyncing(false);
                }
            }
        };

        await attemptSync(0);

    }, [isAuthenticated, currentSpace, chatList]);

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
    }, [isAuthenticated, currentSpace]);

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
                onSwitchChat={chatList.switchChat}
                onNewChat={handleCreateNewChat}
                onTriggerDeleteAll={handleTriggerDeleteAll}
                onTriggerRename={handleTriggerRename}
                onTriggerDelete={handleTriggerDelete}
                onCloseMobileMenu={() => setShowMobileMenu(false)}
            />

            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="sticky top-0 z-10 h-16 border-b bg-background/95 backdrop-blur-sm flex items-center justify-between px-4 md:px-6">
                    <div className="flex items-center gap-2 md:gap-3">
                        {isMobile ? (
                            <Button variant="ghost" size="icon" onClick={() => setShowMobileMenu(true)} className="text-primary hover:bg-primary/10 rounded-full h-9 w-9"><Menu className="h-5 w-5" /></Button>
                        ) : (
                            <Button variant="ghost" size="icon" onClick={() => handleBackNavigation(router, setInitialTab)} className="text-primary hover:bg-primary/10 rounded-full h-9 w-9" title="Back to Dashboard"><ArrowLeft className="h-5 w-5" /></Button>
                        )}
                        <div className="flex items-center gap-2">
                            <h2 className="text-base md:text-lg font-semibold">AI Assistant</h2>
                            <TooltipProvider><Tooltip><TooltipTrigger><span className="inline-flex items-center rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive ring-1 ring-inset ring-destructive/20">Alpha</span></TooltipTrigger><TooltipContent side="bottom"><p className="max-w-xs">This is a rough Alpha version. Features and performance may change significantly.</p></TooltipContent></Tooltip></TooltipProvider>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                        {isAuthenticated && (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="sm" className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs h-auto ${isSyncing ? 'text-blue-600 bg-blue-100/60 dark:text-blue-400 dark:bg-blue-900/30' : syncActivity === 'error' ? 'text-destructive bg-destructive/10' : 'text-muted-foreground hover:bg-accent'}`}>
                                        <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                                        <span>
                                            {syncActivity === 'checking' ? 'Checking...' :
                                                syncActivity === 'pulling' ? 'Pulling Chats' :
                                                    syncActivity === 'saving' ? 'Saving Chats' :
                                                        syncActivity === 'error' ? 'Sync Error' :
                                                            'Up to date'}
                                        </span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 text-sm p-3" side="bottom" align="end">
                                    <div className="font-medium mb-2 border-b pb-2">Sync Status</div>
                                    <div className="space-y-1.5">
                                        <p>Status: {
                                            syncActivity === 'checking' ? 'Checking for changes...' :
                                                syncActivity === 'pulling' ? 'Pulling changes...' :
                                                    syncActivity === 'saving' ? 'Saving changes...' :
                                                        syncActivity === 'error' ? <span className="text-destructive">Error</span> :
                                                            'Idle (Up to date)'
                                        }</p>
                                        <p>Space: <span className="font-medium">{currentSpace || 'N/A'}</span></p>
                                        <p>Last Sync: {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'Never'}</p>
                                        {lastSyncStats && !isSyncing && syncActivity !== 'error' && (
                                            <div className="text-xs pt-1 text-muted-foreground">
                                                <p>Synced from server: {lastSyncStats.pulled}</p>
                                                <p>Saved to server (Update): {lastSyncStats.pushedUpdates}</p>
                                                <p>Saved to server (Create): {lastSyncStats.pushedCreates}</p>
                                                {lastSyncStats.errors > 0 && <p className="text-destructive">Errors: {lastSyncStats.errors}</p>}
                                            </div>
                                        )}
                                        {syncError && (
                                            <p className="text-xs text-destructive pt-1">Error: {syncError.substring(0, 200)}</p>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 mt-3">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 text-xs"
                                            onClick={() => {
                                                console.log("[Sync Button] 'Check for Pulls' triggered.");
                                                setIsPulling(true);
                                                syncChatsRef.current();
                                            }}
                                            disabled={isSyncing}
                                            title="Check server for newer chats or deletions"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`mr-1.5 h-3.5 w-3.5 ${isPulling ? 'animate-spin' : ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                                            {isPulling ? 'Pulling...' : 'Check for Pulls'}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 text-xs"
                                            onClick={() => {
                                                console.log("[Sync Button] 'Push Local Changes' triggered.");
                                                setIsSaving(true);
                                                syncChatsRef.current();
                                            }}
                                            disabled={isSyncing}
                                            title="Ensure local updates are saved to the server"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`mr-1.5 h-3.5 w-3.5 ${isSaving ? 'animate-spin' : ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
                                            {isSaving ? 'Saving...' : 'Push Local Changes'}
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        )}

                        {isNonGlobalSpace && !isInitializing && (
                            <>
                                <TooltipProvider delayDuration={200}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <AuthenticatedActionButton
                                                variant="ghost" className={`flex items-center gap-1.5 cursor-pointer transition-colors p-1.5 rounded-full ${isMobile ? '' : 'hover:bg-accent'}`}
                                                onClick={() => discourse.setShowDiscourseDialog(true)} role="button"
                                            >
                                                {discourse.isCheckingDiscourse ? (
                                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                                ) : discourse.connectionStatus === 'connected' ? (
                                                    <CircleDotIcon className="h-4 w-4 text-green-500" />
                                                ) : discourse.connectionStatus === 'partially_connected' ? (
                                                    <CircleDotIcon className="h-4 w-4 text-yellow-500" />
                                                ) : discourse.connectionStatus === 'pending' ? (
                                                    <CircleDotIcon className="h-4 w-4 text-blue-500" />
                                                ) : discourse.connectionStatus === 'unavailable_logged_out' ? (
                                                    <CircleIcon className="h-4 w-4 text-gray-500" />
                                                ) : (
                                                    <CircleIcon className="h-4 w-4 text-muted-foreground" />
                                                )}
                                                <span className="text-xs font-medium mr-1">
                                                    {discourse.isCheckingDiscourse ? 'Checking' :
                                                        discourse.connectionStatus === 'connected' ? 'Connected' :
                                                            discourse.connectionStatus === 'partially_connected' ? 'Messages Stored' :
                                                                discourse.connectionStatus === 'pending' ? 'Pending Fetch' :
                                                                    discourse.connectionStatus === 'unavailable_logged_out' ? 'Login Required' :
                                                                        'Not Connected'}
                                                </span>
                                            </AuthenticatedActionButton>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom">
                                            {discourse.isCheckingDiscourse ? 'Checking Discourse connection...' :
                                                discourse.connectionStatus === 'connected' ? `Connected as ${discourse.discourseUsername}` :
                                                    discourse.connectionStatus === 'partially_connected' ? 'Stored messages found. Connect to update.' :
                                                        discourse.connectionStatus === 'pending' ? 'Ready to fetch messages. Click settings to connect.' :
                                                            discourse.connectionStatus === 'unavailable_logged_out' ? 'Login required to connect Discourse' :
                                                                'Connect to Discourse'}
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-hidden bg-muted/20">
                    {isInitializing ? (
                        <ChatLoadingState />
                    ) : chatState.chatMessages.length === 0 ? (
                        <div className="h-full flex items-center justify-center p-4 md:p-6">
                            <div className="max-w-2xl w-full space-y-6 md:space-y-8">
                                <div className="text-center space-y-1">
                                    <h2 className="text-lg md:text-xl font-bold">How can I help?</h2>
                                    <p className="text-muted-foreground text-xs md:text-sm">Select an option or start typing below</p>
                                </div>
                                <div className="grid gap-3 md:gap-4 sm:grid-cols-2">
                                    <AuthenticatedActionButton
                                        variant="outline" className="h-auto min-h-[6rem] p-2 md:min-h-[8rem] md:p-4 flex flex-col items-center justify-center gap-1.5 text-center rounded-lg hover:bg-accent focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2"
                                        onClick={() => handleStartChatOption('distill')}
                                        disabled={chatState.isGenerating || !isAuthenticated || userRationales.length === 0}
                                    >
                                        <div className="text-sm md:text-lg font-semibold">Distill Rationales</div>
                                        <p className="text-xs text-muted-foreground text-balance">
                                            {!isAuthenticated
                                                ? "Log in to see your rationales"
                                                : userRationales.length === 0
                                                    ? "You don't have any rationales yet."
                                                    : "Organize your existing rationales into an essay."}
                                        </p>
                                    </AuthenticatedActionButton>
                                    <Button variant="outline" className="h-auto min-h-[6rem] p-2 md:min-h-[8rem] md:p-4 flex flex-col items-center justify-center gap-1.5 text-center rounded-lg hover:bg-accent focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 opacity-50 cursor-not-allowed" disabled aria-disabled="true">
                                        <div className="text-sm md:text-lg font-semibold">Build from Posts</div><p className="text-xs text-muted-foreground text-balance">Create rationales from your forum posts.</p><span className="text-xs text-primary font-medium mt-1">Coming Soon</span>
                                    </Button>
                                </div>
                                <p className="text-center text-xs text-muted-foreground">Or, just type your message below to start a general chat.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full overflow-y-auto" id="chat-scroll-area">
                            <div className={`space-y-4 md:space-y-6 py-4 md:py-6 px-2 md:px-4`}>
                                {chatState.chatMessages.map((msg, i) => (
                                    <div key={`${chatList.currentChatId || 'nochat'}-${i}`} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`${isMobile ? 'max-w-[90%]' : 'max-w-[80%]'} rounded-xl md:rounded-2xl p-3 md:p-4 shadow-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card text-card-foreground'}`}>
                                            <div className="relative group">
                                                <MemoizedMarkdown
                                                    content={msg.content} id={`msg-${i}`}
                                                    isUserMessage={msg.role === 'user'}
                                                    space={currentSpace}
                                                    discourseUrl={discourse.discourseUrl}
                                                    storedMessages={discourse.storedMessages}
                                                />
                                                <Button variant="ghost" size="icon" className="absolute bottom-1 right-1 h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-70 focus-visible:opacity-100 hover:opacity-100 transition-opacity duration-150" onClick={async (e) => { const button = e.currentTarget; try { await navigator.clipboard.writeText(msg.content); button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3 w-3 text-green-500"><polyline points="20 6 9 17 4 12"></polyline></svg>'; setTimeout(() => { button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3 w-3"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>'; }, 1500); } catch (err) { console.error("Failed to copy:", err); toast.error("Failed to copy text"); } }} title="Copy message">
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                                                </Button>
                                            </div>
                                            {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                                                <div className="mt-2 pt-1">
                                                    <DetailedSourceList
                                                        sources={msg.sources} space={currentSpace}
                                                        discourseUrl={discourse.discourseUrl}
                                                        storedMessages={discourse.storedMessages}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {chatState.isGenerating && chatState.isFetchingContext && (
                                    <div className="flex justify-center items-center p-4">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Fetching relevant Negation Game user activity...
                                        </div>
                                    </div>
                                )}
                                {chatState.streamingContent && (
                                    <div className="flex justify-start">
                                        <div className={`${isMobile ? 'max-w-[90%]' : 'max-w-[80%]'} rounded-xl md:rounded-2xl p-3 md:p-4 shadow-sm bg-card text-card-foreground mr-4 [&_.markdown]:text-sm [&_.markdown]:md:text-base`}>
                                            <MemoizedMarkdown
                                                content={chatState.streamingContent + " ▋"} id="streaming"
                                                space={currentSpace} discourseUrl={discourse.discourseUrl}
                                                storedMessages={discourse.storedMessages}
                                            />
                                        </div>
                                    </div>
                                )}
                                <div ref={chatState.chatEndRef} className="h-1" />
                            </div>
                        </div>
                    )}
                </div>

                <div className={`flex-shrink-0 border-t bg-background ${isMobile ? 'p-2' : 'p-4'}`}>
                    <form className={`w-full lg:max-w-3xl xl:max-w-4xl mx-auto flex items-end gap-2 md:gap-3`} onSubmit={handleFormSubmit}>
                        <AutosizeTextarea
                            value={chatState.message}
                            onChange={(e) => chatState.setMessage(e.target.value)}
                            placeholder={!isAuthenticated ? "Login to chat..." : chatState.isGenerating ? "Waiting for response..." : "Type your message here... (Ctrl+Enter to send)"}
                            className="flex-1 py-2.5 px-3 md:px-4 text-xs sm:text-sm md:text-base rounded-lg border shadow-sm resize-none focus-visible:ring-1 focus-visible:ring-ring"
                            disabled={chatState.isGenerating || isInitializing || !currentSpace || !isAuthenticated}
                            style={{ minHeight: '40px', maxHeight: isMobile ? '100px' : '160px' }}
                            onKeyDown={handleKeyDown}
                        />
                        <AuthenticatedActionButton
                            type="submit"
                            disabled={chatState.isGenerating || !chatState.message.trim() || !isAuthenticated || isInitializing}
                            rightLoading={chatState.isGenerating}
                            className="rounded-lg h-9 px-3 md:h-10 md:px-4"
                            title="Send Message (Ctrl+Enter)"
                        >
                            {!chatState.isGenerating && (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>
                            )}
                        </AuthenticatedActionButton>
                        <AuthenticatedActionButton type="button" variant="ghost" size="icon" onClick={() => setShowSettingsDialog(true)} className="rounded-lg h-9 w-9 md:h-10 md:w-10 text-muted-foreground hover:text-foreground" title="Chat Settings">
                            <SlidersHorizontal className="h-4 w-4" />
                        </AuthenticatedActionButton>
                    </form>
                </div>
            </div>

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
        </div>
    );
} 