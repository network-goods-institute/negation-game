"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ArrowLeft, Trash2, MessageSquare, CircleIcon, CircleDotIcon, Plus, Menu, X, SlidersHorizontal } from "lucide-react";
import { useUser } from "@/queries/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { updateUserProfile } from "@/actions/updateUserProfile";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { userQueryKey } from "@/queries/useUser";
import { useRouter } from "next/navigation";
import { generateChatBotResponse, EndorsedPoint } from "@/actions/generateChatBotResponse";
import { nanoid } from "nanoid";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { MemoizedMarkdown } from "@/components/ui/MemoizedMarkdown";
import { AuthenticatedActionButton } from "@/components/ui/AuthenticatedActionButton";
import { fetchUserEndorsedPoints } from "@/actions/fetchUserEndorsedPoints";
import { getSpace } from "@/actions/getSpace";
import { Skeleton } from "../ui/skeleton";
import { AutosizeTextarea } from "../ui/autosize-textarea";
import { fetchUserViewpoints } from "@/actions/fetchUserViewpoints";
import { generateChatName } from "@/actions/generateChatName";
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

export interface DiscourseMessage {
    id: number;
    content: string;
    raw: string;
    created_at: string;
    topic_id?: number;
    topic_title?: string;
    space: string;
}

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface SavedChat {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: string;
    updatedAt: string;
    space: string;
}

export interface ChatRationale {
    id: string;
    title: string;
    description: string;
    author: string;
    graph: {
        nodes: Array<{
            id: string;
            type: "point" | "statement" | "addPoint";
            data: {
                content?: string;
                statement?: string;
                pointId?: number;
            };
        }>;
        edges: Array<{
            id: string;
            type: string;
            source: string;
            target: string;
        }>;
    };
    statistics: {
        views: number;
        copies: number;
        totalCred: number;
        averageFavor: number;
    };
}

export interface ChatSettings {
    includeEndorsements: boolean;
    includeRationales: boolean;
    includePoints: boolean;
    includeDiscourseMessages: boolean;
}

export type DiscourseConnectionStatus =
    | 'disconnected'        // No credentials, no messages
    | 'connected'          // Has valid credentials and messages
    | 'partially_connected' // Has messages but no/invalid credentials
    | 'pending'           // Has credentials but no messages yet
    | 'unavailable_logged_out'; // In space, but not logged in

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

const ChatListSkeleton = () => {
    return (
        <div className="p-3 space-y-3">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="px-4 py-3 rounded-xl">
                    <div className="flex flex-col space-y-2">
                        <Skeleton className="h-4 w-4/5" />
                        <Skeleton className="h-3 w-2/3" />
                    </div>
                </div>
            ))}
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

type InitialOption = 'distill' | 'build' | null;

export default function AIAssistant() {
    const router = useRouter();
    const { user: privyUser } = usePrivy();
    const { data: userData } = useUser(privyUser?.id);
    const queryClient = useQueryClient();
    const isMobile = useIsMobile();
    const isAuthenticated = !!privyUser;

    // loading states
    const [isInitializing, setIsInitializing] = useState(true);
    const [isCheckingDiscourse, setIsCheckingDiscourse] = useState(true);

    // Discourse-related state
    const [showDiscourseDialog, setShowDiscourseDialog] = useState(false);
    const [isConnectingToDiscourse, setIsConnectingToDiscourse] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [discourseUsername, setDiscourseUsername] = useState('');
    const [discourseUrl, setDiscourseUrl] = useState('https://forum.scroll.io');
    const [storedMessages, setStoredMessages] = useState<DiscourseMessage[]>([]);
    const [showMessagesModal, setShowMessagesModal] = useState(false);
    const [showConsentDialog, setShowConsentDialog] = useState(false);
    const [hasStoredMessages, setHasStoredMessages] = useState(false);
    const [fetchProgress, setFetchProgress] = useState(0);
    const [endorsedPoints, setEndorsedPoints] = useState<EndorsedPoint[]>([]);
    const [userRationales, setUserRationales] = useState<ChatRationale[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<DiscourseConnectionStatus>('disconnected');
    const [isUpdatingConsent, setIsUpdatingConsent] = useState(false);

    const loadStoredMessages = useCallback(() => {
        try {
            if (typeof window !== 'undefined') {
                const storedData = localStorage.getItem('discourse_messages');
                if (storedData) {
                    const messages = JSON.parse(storedData);
                    if (Array.isArray(messages) && messages.length > 0) {
                        return messages;
                    }
                }
            }
        } catch (error) {
            console.error("Error parsing stored messages:", error);
        }
        return [];
    }, []);

    // Chat-related state
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
    const [showSidebar, _] = useState(true);
    const [message, setMessage] = useState('');
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);
    const [chatToDelete, setChatToDelete] = useState<string | null>(null);
    const [chatToRename, setChatToRename] = useState<string | null>(null);
    const [newChatTitle, setNewChatTitle] = useState('');
    const [currentSpace, setCurrentSpace] = useState<string | null>(null);
    const [selectedOption, setSelectedOption] = useState<InitialOption>(null);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [showSettingsDialog, setShowSettingsDialog] = useState(false);
    const [settings, setSettings] = useState<ChatSettings>(() => {
        // Try to load settings from localStorage
        if (typeof window !== 'undefined') {
            const savedSettings = localStorage.getItem('chat_settings');
            if (savedSettings) {
                try {
                    return JSON.parse(savedSettings);
                } catch (e) {
                    console.error('Error parsing saved chat settings:', e);
                }
            }
        }
        return {
            includeEndorsements: true,
            includeRationales: true,
            includePoints: true,
            includeDiscourseMessages: true
        };
    });

    const isNonGlobalSpace = currentSpace !== null && currentSpace !== 'global';

    const updateChat = useCallback((chatId: string, messages: ChatMessage[], title?: string) => {
        if (!currentSpace) return;

        setSavedChats(prev => {
            const updatedChats = prev.map(chat => {
                if (chat.id === chatId) {
                    return {
                        ...chat,
                        title: title || chat.title,
                        messages,
                        updatedAt: new Date().toISOString()
                    };
                }
                return chat;
            });
            localStorage.setItem(`saved_chats_${currentSpace}`, JSON.stringify(updatedChats));
            return updatedChats;
        });
    }, [currentSpace]);

    const createNewChat = useCallback(() => {
        if (!currentSpace) {
            console.error('Cannot create chat: No space selected');
            return;
        }

        const newChatId = nanoid();
        const newChat: SavedChat = {
            id: newChatId,
            title: 'New Chat',
            messages: [], // No initial message
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            space: currentSpace
        };

        setSavedChats(prev => {
            const updated = [newChat, ...prev];
            if (currentSpace) {
                localStorage.setItem(`saved_chats_${currentSpace}`, JSON.stringify(updated));
            }
            return updated;
        });

        setCurrentChatId(newChatId);
        setChatMessages([]);
        setSelectedOption(null);
        setShowMobileMenu(false);
    }, [currentSpace]);

    const startChatWithOption = useCallback(async (option: InitialOption) => {
        if (!option || !currentSpace || !isAuthenticated) return;
        setShowMobileMenu(false);

        const chatIdToUse = currentChatId || nanoid();
        const isNewChatCreation = !currentChatId;

        let initialUserMessage: string;

        if (option === 'distill') {
            initialUserMessage = "I'd like to distill my existing rationales into a well-structured essay. Please help me organize and refine my thoughts based on my rationales that you can see.";
        } else {
            initialUserMessage = "I'd like to build a new rationale from my forum posts and our discussion. Please help me organize my thoughts based on my forum posts and my points.";
        }

        const initialMessages: ChatMessage[] = [{
            role: 'user',
            content: initialUserMessage
        }];

        if (isNewChatCreation) {
            const newChat: SavedChat = {
                id: chatIdToUse,
                title: 'New Chat',
                messages: initialMessages,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                space: currentSpace
            };

            setSavedChats(prev => {
                const updated = [newChat, ...prev];
                localStorage.setItem(`saved_chats_${currentSpace}`, JSON.stringify(updated));
                return updated;
            });
            setCurrentChatId(chatIdToUse);
        } else {
            // If using existing chat, clear previous messages but keep ID
            updateChat(chatIdToUse, initialMessages);
        }

        setChatMessages(initialMessages); // Set messages for the current view
        setSelectedOption(option);
        setIsGenerating(true);
        setStreamingContent('');

        try {
            let contextRationales: ChatRationale[] | undefined = undefined;
            let systemMessages: ChatMessage[] = [];

            if (option === 'distill' && settings.includeRationales) {
                contextRationales = userRationales;
            } else if (option === 'build' && settings.includeDiscourseMessages && storedMessages.length > 0) {
                systemMessages = storedMessages.map(msg => ({
                    role: 'system' as const,
                    content: `From forum post "${msg.topic_title || 'Untitled'}": ${msg.raw || msg.content}`
                }));
            }

            const contextEndorsements = settings.includeEndorsements && settings.includePoints ? endorsedPoints : undefined;

            const response = await generateChatBotResponse(
                [...systemMessages, ...initialMessages],
                contextEndorsements,
                contextRationales
            );

            if (!response) throw new Error("Failed to get response stream");

            // --- Stream handling ---
            let content = '';
            for await (const chunk of response) {
                if (chunk === null || chunk === undefined) continue;
                content += String(chunk) + '\n\n';
                setStreamingContent(content);
            }

            // 1. Normalize line endings
            content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            // 2. Trim trailing spaces/newlines
            content = content.trim();

            const assistantMessage: ChatMessage = { role: 'assistant', content };
            const finalMessages = [...initialMessages, assistantMessage];
            setChatMessages(finalMessages);
            setStreamingContent('');

            if (chatIdToUse) {
                const chatToUpdate = savedChats.find(c => c.id === chatIdToUse);
                const needsTitle = isNewChatCreation || (chatToUpdate && chatToUpdate.title === 'New Chat');

                if (needsTitle) {
                    try {
                        const titleStream = await generateChatName(finalMessages);
                        if (!titleStream) throw new Error("Failed to get title stream");

                        let title = "";
                        for await (const chunk of titleStream) {
                            if (chunk === null || chunk === undefined) continue;
                            title += String(chunk);
                        }
                        title = title.trim().slice(0, 50); // Limit title length

                        if (title) {
                            updateChat(chatIdToUse, finalMessages, title);
                        } else {
                            // Fallback title if generation fails or returns empty
                            const userMsgContent = initialUserMessage.slice(0, 47) + (initialUserMessage.length > 47 ? '...' : '');
                            updateChat(chatIdToUse, finalMessages, userMsgContent || 'Chat');
                        }
                    } catch (titleError) {
                        console.error("Error generating chat name:", titleError);
                        const userMsgContent = initialUserMessage.slice(0, 47) + (initialUserMessage.length > 47 ? '...' : '');
                        updateChat(chatIdToUse, finalMessages, userMsgContent || 'Chat'); // Fallback title on error
                    }
                } else {
                    updateChat(chatIdToUse, finalMessages);
                }
            }

        } catch (error) {
            console.error('Error starting chat with option:', error);
            const errorMessage: ChatMessage = {
                role: 'assistant',
                content: 'I apologize, but I encountered an error starting this chat. Please try again.'
            };
            const errorMessages = [...initialMessages, errorMessage];
            setChatMessages(errorMessages);
            if (chatIdToUse) {
                updateChat(chatIdToUse, errorMessages);
            }
        } finally {
            setIsGenerating(false);
            setStreamingContent('');
        }
    }, [currentSpace, currentChatId, userRationales, storedMessages, settings, endorsedPoints, updateChat, savedChats, isAuthenticated]);

    const deleteChat = useCallback((chatId: string) => {
        if (!currentSpace || !isAuthenticated) return;
        setShowMobileMenu(false);

        const updatedChats = savedChats.filter(chat => chat.id !== chatId);
        setSavedChats(updatedChats);
        localStorage.setItem(`saved_chats_${currentSpace}`, JSON.stringify(updatedChats));

        if (chatId === currentChatId) {
            if (updatedChats.length > 0) {
                setCurrentChatId(updatedChats[0].id);
                setChatMessages(updatedChats[0].messages || []);
            } else {
                setCurrentChatId(null);
                setChatMessages([]);
                setSelectedOption(null);
            }
        }
        setChatToDelete(null);
    }, [currentSpace, currentChatId, savedChats, isAuthenticated]);

    const switchChat = useCallback((chatId: string) => {
        const chat = savedChats.find(c => c.id === chatId);
        if (chat) {
            setCurrentChatId(chatId);
            setChatMessages(chat.messages || []);
            setSelectedOption(null);
            setShowMobileMenu(false);
        }
    }, [savedChats]);

    const renameChat = useCallback((chatId: string, newTitle: string) => {
        if (!newTitle.trim() || !currentSpace || !isAuthenticated) return;

        setSavedChats(prev => {
            const updated = prev.map(chat =>
                chat.id === chatId ? { ...chat, title: newTitle.trim().slice(0, 50) } : chat // Limit title length on rename
            );
            localStorage.setItem(`saved_chats_${currentSpace}`, JSON.stringify(updated));
            return updated;
        });

        setChatToRename(null);
        setNewChatTitle('');
    }, [currentSpace, isAuthenticated]);

    useEffect(() => {
        if (!isNonGlobalSpace) {
            setStoredMessages([]);
            setHasStoredMessages(false);
            setConnectionStatus('disconnected');
            setIsCheckingDiscourse(false);
            return;
        }

        const checkStored = () => {
            setIsCheckingDiscourse(true);
            try {
                const messages = loadStoredMessages();
                setStoredMessages(messages);
                setHasStoredMessages(messages.length > 0);
            } catch (error) {
                console.error("Error checking stored messages:", error);
                setStoredMessages([]);
                setHasStoredMessages(false);
            } finally {
                setTimeout(() => setIsCheckingDiscourse(false), 100);
            }
        };

        checkStored();
    }, [isNonGlobalSpace, loadStoredMessages]);

    useEffect(() => {
        // 1. If not in a space, it's always disconnected
        if (!isNonGlobalSpace) {
            setConnectionStatus('disconnected');
            return;
        }

        // 2. If loading discourse messages or initial user data, wait
        if (isCheckingDiscourse || isInitializing) {
            return;
        }

        // 3. If in a space, but no user data (not logged in) after initialization
        if (!isAuthenticated) {
            setConnectionStatus('unavailable_logged_out');
            return;
        }

        // 4. User is logged in (isAuthenticated is true), in a space. Proceed
        const hasCreds = discourseUsername.trim();
        const hasMsgs = storedMessages.length > 0;
        const hasConsent = userData?.discourseConsentGiven;
        const profileUsernameMatches = userData?.discourseUsername === discourseUsername.trim();

        if (hasMsgs) {
            // Has messages: Connected if profile username matches & has consent, otherwise partially
            if (profileUsernameMatches && hasConsent) {
                setConnectionStatus('connected');
            } else {
                // Messages exist, but creds don't match OR consent missing OR userData still loading
                setConnectionStatus('partially_connected');
            }
        } else if (hasCreds && hasConsent) {
            // No messages, but profile creds match & consent given: Pending fetch
            if (profileUsernameMatches) {
                setConnectionStatus('pending');
            } else {
                // Consent given, creds entered don't match profile yet OR userData still loading
                setConnectionStatus('disconnected'); // Treat as disconnected until they connect/update
            }
        } else {
            // No messages, and either no creds entered, or no consent
            setConnectionStatus('disconnected');
        }
    }, [
        isNonGlobalSpace,
        isCheckingDiscourse,
        isInitializing,
        isAuthenticated,
        userData,
        storedMessages.length,
        discourseUsername,
    ]);

    useEffect(() => {
        if (userData?.discourseUsername && !discourseUsername) {
            setDiscourseUsername(userData.discourseUsername);
        }
    }, [userData, discourseUsername]);

    const saveMessagesToStorage = useCallback((messages: DiscourseMessage[]) => {
        if (!Array.isArray(messages) || messages.length === 0) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('discourse_messages');
            }
            setStoredMessages([]);
            setHasStoredMessages(false);
            return;
        }

        try {
            if (typeof window !== 'undefined') {
                localStorage.setItem('discourse_messages', JSON.stringify(messages));
                setStoredMessages(messages);
                setHasStoredMessages(true);
            }
        } catch (error) {
            console.error('Error saving messages to localStorage:', error);
            toast.error('Error saving messages: Storage error');
        }
    }, []);

    const handleViewMessages = useCallback(() => {
        try {
            const messages = loadStoredMessages();
            if (messages.length > 0) {
                setShowMessagesModal(true);
            } else {
                toast.error('No messages found. Please connect to Discourse first.');
            }
        } catch (error) {
            console.error("Error loading messages:", error);
            toast.error('Error loading messages from storage');
        }
    }, [loadStoredMessages]);

    const handleDeleteMessages = useCallback(() => {
        if (!isAuthenticated) return;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('discourse_messages');
            setStoredMessages([]);
            setHasStoredMessages(false);
            toast.success('Messages deleted successfully');
        }
    }, [isAuthenticated]);

    const handleUpdateProfile = useCallback(async (values: {
        discourseUsername: string;
        discourseCommunityUrl: string;
        discourseConsentGiven: boolean;
    }) => {
        if (!isAuthenticated) return;
        try {
            const result = await updateUserProfile({
                discourseUsername: values.discourseUsername.trim() || null,
                discourseCommunityUrl: values.discourseCommunityUrl.trim() || null,
                discourseConsentGiven: values.discourseConsentGiven,
            });

            if (result.success) {
                if (privyUser?.id) {
                    queryClient.setQueryData(userQueryKey(privyUser.id), (oldData: any) => {
                        if (!oldData) return oldData;
                        return {
                            ...oldData,
                            discourseUsername: values.discourseUsername.trim() || null,
                            discourseCommunityUrl: values.discourseCommunityUrl.trim() || null,
                            discourseConsentGiven: values.discourseConsentGiven,
                        };
                    });
                    if (privyUser?.id) {
                        const userId = privyUser.id;
                        await queryClient.invalidateQueries({ queryKey: userQueryKey(userId) });
                    }
                }
            } else {
                throw new Error(result.error || "Unknown error updating profile");
            }
        } catch (error) {
            console.error('Failed to update profile:', error);
            throw error;
        }
    }, [privyUser?.id, queryClient, isAuthenticated]);

    const handleConnectToDiscourse = useCallback(async () => {
        if (isConnectingToDiscourse || !isAuthenticated) return;
        if (!isNonGlobalSpace) {
            setError('Discourse integration is only available in spaces');
            return;
        }

        try {
            if (!discourseUsername.trim()) {
                setError('Please enter your Discourse username');
                return;
            }
            if (!userData) {
                setError('User data not loaded yet. Please try again.');
                return;
            }

            if (!userData.discourseConsentGiven) {
                setShowConsentDialog(true);
                return;
            }

            setIsConnectingToDiscourse(true);
            setError(null);
            setFetchProgress(10);

            const cleanUrl = discourseUrl.trim().replace(/\/$/, '');

            if (userData.discourseUsername !== discourseUsername.trim() ||
                userData.discourseCommunityUrl !== cleanUrl) {
                await handleUpdateProfile({
                    discourseUsername: discourseUsername.trim(),
                    discourseCommunityUrl: cleanUrl,
                    discourseConsentGiven: true,
                });
                if (privyUser?.id) {
                    await queryClient.refetchQueries({ queryKey: userQueryKey(privyUser.id) });
                }
            }

            setFetchProgress(20);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
                setError("Connection timed out. Please try again.");
                setFetchProgress(0);
                setIsConnectingToDiscourse(false);
            }, 60000);

            const progressUrl = `/api/discourse/posts/stream?username=${encodeURIComponent(discourseUsername.trim())}&url=${encodeURIComponent(cleanUrl)}`;
            const eventSource = new EventSource(progressUrl);
            let eventSourceClosed = false;

            const closeEventSource = () => {
                if (!eventSourceClosed) {
                    eventSource.close();
                    eventSourceClosed = true;
                    console.log("EventSource closed.");
                }
            };

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.progress) {
                        setFetchProgress(prev => Math.max(prev, 20 + (data.progress * 0.7)));
                    }
                    if (data.done) {
                        console.log("EventSource received done message.");
                        closeEventSource();
                    }
                } catch (e) {
                    console.error("Error parsing SSE message:", e);
                }
            };

            eventSource.onerror = (err) => {
                console.error("EventSource failed:", err);
                closeEventSource();
            };

            const fetchUrl = `/api/discourse/posts?username=${encodeURIComponent(discourseUsername.trim())}&url=${encodeURIComponent(cleanUrl)}`;
            const response = await fetch(fetchUrl, { signal: controller.signal });

            clearTimeout(timeoutId);
            closeEventSource();

            setFetchProgress(prev => Math.max(prev, 90));

            if (!response.ok) {
                let errorMsg = `Failed (${response.status}): ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorMsg;
                } catch (e) { /* Ignore JSON parse error */ }
                throw new Error(errorMsg);
            }

            const data = await response.json();

            setFetchProgress(95);
            let rawPosts = [];
            if (data && typeof data === 'object') {
                const potentialKeys = ['latest_posts', 'posts', 'user_actions', 'actions_summary'];
                for (const key of potentialKeys) {
                    if (Array.isArray(data[key])) {
                        rawPosts = data[key];
                        break;
                    }
                }
                if (rawPosts.length === 0 && Array.isArray(data)) {
                    rawPosts = data;
                } else if (rawPosts.length === 0) {
                    const firstArrayKey = Object.keys(data).find(key => Array.isArray(data[key]));
                    if (firstArrayKey) {
                        rawPosts = data[firstArrayKey];
                        console.warn(`Using discovered array key: ${firstArrayKey}`);
                    }
                }
            } else if (Array.isArray(data)) {
                rawPosts = data;
                console.log("API response is a direct array.");
            }

            if (!Array.isArray(rawPosts)) {
                throw new Error('Could not extract posts array from API response');
            }

            const processedMessages: DiscourseMessage[] = rawPosts
                .map((msg: any, index: number): DiscourseMessage | null => {
                    if (!msg || typeof msg !== 'object') return null;
                    return {
                        id: msg.id || index,
                        content: msg.cooked || msg.content || '',
                        raw: msg.raw || '',
                        created_at: msg.created_at || new Date().toISOString(),
                        topic_id: msg.topic_id,
                        topic_title: msg.topic_title || msg.topic_slug || 'Untitled Topic',
                        space: currentSpace || 'global'
                    };
                })
                .filter((msg): msg is DiscourseMessage => msg !== null && (!!msg.content || !!msg.raw));

            if (processedMessages.length > 0) {
                saveMessagesToStorage(processedMessages);
                toast.success(`Successfully connected! Found ${processedMessages.length} relevant posts.`);
                setShowDiscourseDialog(false);
            } else {
                saveMessagesToStorage([]);
                toast.info('Connected, but no relevant posts found for this username.');
                setShowDiscourseDialog(false);
            }

            setFetchProgress(100);

        } catch (error: any) {
            if (error.name === 'AbortError') {
                if (!error) setError("Connection timed out. Please try again.");
            } else {
                setError(`Connection failed: ${error.message || 'Please check username/URL and try again.'}`);
                console.error("handleConnectToDiscourse Error:", error);
            }
            setFetchProgress(0);
        } finally {
            setIsConnectingToDiscourse(false);
        }
    }, [
        isConnectingToDiscourse,
        isNonGlobalSpace,
        discourseUsername,
        discourseUrl,
        userData,
        handleUpdateProfile,
        saveMessagesToStorage,
        queryClient,
        privyUser?.id,
        currentSpace,
        isAuthenticated
    ]);

    const handleConsentAndConnect = useCallback(async () => {
        if (isUpdatingConsent || !isAuthenticated) return;

        try {
            setIsUpdatingConsent(true);
            if (!userData) {
                toast.error('User data not available. Cannot grant consent.');
                setShowConsentDialog(false);
                return;
            }

            await handleUpdateProfile({
                discourseUsername: discourseUsername.trim(),
                discourseCommunityUrl: discourseUrl.trim().replace(/\/$/, ''),
                discourseConsentGiven: true,
            });

            setShowConsentDialog(false);

            setTimeout(() => {
                handleConnectToDiscourse();
            }, 100);

        } catch (error) {
            console.error('Failed to update consent:', error);
            toast.error('Failed to update consent settings. Please try connecting again.');
            setShowConsentDialog(false);
        } finally {
            setIsUpdatingConsent(false);
        }
    }, [
        isUpdatingConsent,
        userData,
        discourseUsername,
        discourseUrl,
        handleUpdateProfile,
        handleConnectToDiscourse,
        isAuthenticated
    ]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('chat_settings', JSON.stringify(settings));
        }
    }, [settings]);

    useEffect(() => {
        const initializeAssistant = async () => {
            setIsInitializing(true);
            try {
                const space = await getSpace();
                setCurrentSpace(space);

                let points: EndorsedPoint[] = [];
                let rationalesResult: any[] | null = null;
                if (isAuthenticated) {
                    const results = await Promise.all([
                        fetchUserEndorsedPoints(),
                        fetchUserViewpoints()
                    ]);
                    points = results[0] || [];
                    rationalesResult = results[1];
                }

                setEndorsedPoints(points);

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
                            nodes: (graphData.nodes || []).map((n: any) => ({
                                id: String(n.id || nanoid()),
                                type: ["point", "statement", "addPoint"].includes(n.type) ? n.type as "point" | "statement" | "addPoint" : "statement",
                                data: {
                                    content: n.data?.content ? String(n.data.content) : undefined,
                                    statement: n.data?.statement ? String(n.data.statement) : undefined,
                                    pointId: n.data?.pointId != null ? Number(n.data.pointId) : undefined
                                }
                            })),
                            edges: (graphData.edges || []).map((e: any) => ({
                                id: String(e.id || nanoid()),
                                type: String(e.type || 'default'),
                                source: String(e.source || ''),
                                target: String(e.target || '')
                            }))
                        },
                        statistics: {
                            views: Number(statsData.views || 0),
                            copies: Number(statsData.copies || 0),
                            totalCred: Number(statsData.totalCred || 0),
                            averageFavor: Number(statsData.averageFavor || 0)
                        }
                    };
                });
                setUserRationales(convertedRationales);

                const savedChatsStr = space ? localStorage.getItem(`saved_chats_${space}`) : null;
                let chats: SavedChat[] = [];
                if (savedChatsStr) {
                    try {
                        chats = JSON.parse(savedChatsStr);
                        if (!Array.isArray(chats)) chats = [];
                        chats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
                    } catch (e) { chats = []; }
                }
                setSavedChats(chats);

                if (chats.length > 0) {
                    setCurrentChatId(chats[0].id);
                    setChatMessages(chats[0].messages || []);
                } else {
                    setCurrentChatId(null);
                    setChatMessages([]);
                }

            } catch (error) {
                console.error('Error initializing assistant:', error);
                setCurrentSpace('global');
                const globalChatsStr = localStorage.getItem(`saved_chats_global`);
                let globalChats: SavedChat[] = [];
                if (globalChatsStr) {
                    try {
                        globalChats = JSON.parse(globalChatsStr);
                        if (!Array.isArray(globalChats)) globalChats = [];
                        globalChats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
                    } catch (e) { globalChats = []; }
                }
                setSavedChats(globalChats);
                if (globalChats.length > 0) {
                    setCurrentChatId(globalChats[0].id);
                    setChatMessages(globalChats[0].messages || []);
                } else {
                    setCurrentChatId(null);
                    setChatMessages([]);
                }
                setEndorsedPoints([]);
                setUserRationales([]);
            } finally {
                setTimeout(() => setIsInitializing(false), 150);
            }
        };

        initializeAssistant();
    }, [isAuthenticated]);

    useEffect(() => {
        if (chatMessages.length > 0 || streamingContent) {
            setTimeout(() => {
                chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
            }, 50);
        }
    }, [chatMessages, streamingContent]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!message.trim() || isGenerating || !currentSpace || !isAuthenticated) return;

        const newMessage: ChatMessage = { role: 'user', content: message };
        let activeChatId = currentChatId;
        let isNewChatCreation = false;

        if (!activeChatId) {
            isNewChatCreation = true;
            activeChatId = nanoid();
            const newChat: SavedChat = {
                id: activeChatId,
                title: 'New Chat',
                messages: [newMessage],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                space: currentSpace
            };
            setSavedChats(prev => {
                const updated = [newChat, ...prev];
                localStorage.setItem(`saved_chats_${currentSpace}`, JSON.stringify(updated));
                return updated;
            });
            setCurrentChatId(activeChatId);
            setChatMessages([newMessage]);
        } else {
            const updatedMessages = [...chatMessages, newMessage];
            setChatMessages(updatedMessages);
            updateChat(activeChatId, updatedMessages);
        }


        const messagesForApi = isNewChatCreation ? [newMessage] : [...chatMessages, newMessage];
        setMessage('');
        setIsGenerating(true);
        setStreamingContent('');

        try {
            const systemMessages: ChatMessage[] = [];
            if (settings.includeDiscourseMessages && storedMessages.length > 0) {
                systemMessages.push(...storedMessages.map(msg => ({
                    role: 'system' as const,
                    content: `From forum post "${msg.topic_title || 'Untitled'}": ${msg.raw || msg.content}` // Prefer raw content for less noise? no idea rn
                })));
            }

            // Prepare context data based on settings
            const contextEndorsements = settings.includeEndorsements && settings.includePoints ? endorsedPoints : undefined;
            const contextRationales = settings.includeRationales ? userRationales : undefined;

            const response = await generateChatBotResponse(
                [...systemMessages, ...messagesForApi],
                contextEndorsements,
                contextRationales
            );

            if (!response) throw new Error("Failed to get response stream");

            let content = '';
            for await (const chunk of response) {
                if (chunk === null || chunk === undefined) continue;
                content += String(chunk) + '\n\n';
                setStreamingContent(content);
            }


            content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            content = content.trim();
            const assistantMessage: ChatMessage = { role: 'assistant', content };
            const finalMessages = [...messagesForApi, assistantMessage];
            setChatMessages(finalMessages);
            setStreamingContent('');

            if (activeChatId) {
                const chatToUpdate = savedChats.find(c => c.id === activeChatId);
                const needsTitle = isNewChatCreation || (chatToUpdate && chatToUpdate.title === 'New Chat');

                if (needsTitle) {
                    try {
                        const titleStream = await generateChatName(finalMessages);
                        if (!titleStream) throw new Error("Failed to get title stream");

                        let title = "";
                        for await (const chunk of titleStream) {
                            if (chunk === null || chunk === undefined) continue;
                            title += String(chunk);
                        }
                        title = title.trim().slice(0, 50);
                        if (title) {
                            updateChat(activeChatId, finalMessages, title);
                        } else {
                            const userMsgContent = newMessage.content.slice(0, 47) + (newMessage.content.length > 47 ? '...' : '');
                            updateChat(activeChatId, finalMessages, userMsgContent || 'Chat');
                        }
                    } catch (titleError) {
                        console.error("Error generating chat name:", titleError);
                        const userMsgContent = newMessage.content.slice(0, 47) + (newMessage.content.length > 47 ? '...' : '');
                        updateChat(activeChatId, finalMessages, userMsgContent || 'Chat'); // Fallback title on error
                    }
                } else {
                    updateChat(activeChatId, finalMessages);
                }
            }

        } catch (error) {
            console.error('Error generating response:', error);
            const errorMessage: ChatMessage = {
                role: 'assistant',
                content: 'I apologize, but I encountered an error processing your request. Please try again.'
            };
            const errorMessages = [...messagesForApi, errorMessage];
            setChatMessages(errorMessages);
            if (activeChatId) {
                updateChat(activeChatId, errorMessages);
            }
        } finally {
            setIsGenerating(false);
            setStreamingContent('');
        }
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
            <div className={`${isMobile ? 'fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out' : 'w-72 border-r flex-shrink-0'}
                ${isMobile ? (showMobileMenu ? 'translate-x-0' : '-translate-x-full') : ''}
                ${isMobile ? 'w-72 bg-background border-r' : 'bg-background/90'}`}>
                <div className="h-full flex flex-col">
                    <div className="h-16 border-b flex items-center justify-between px-4 md:px-6">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-primary" />
                            Chats
                        </h2>
                        <div className="flex items-center gap-1">
                            <AuthenticatedActionButton
                                variant="ghost"
                                size="icon"
                                onClick={createNewChat}
                                title="New Chat"
                                className="rounded-full h-8 w-8"
                            >
                                <Plus className="h-4 w-4" />
                            </AuthenticatedActionButton>
                            {isMobile && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowMobileMenu(false)}
                                    className="rounded-full h-8 w-8"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                    <ScrollArea className="flex-1">
                        {isInitializing ? (
                            <ChatListSkeleton />
                        ) : savedChats.length === 0 ? (
                            <div className="text-center py-8 px-4 text-muted-foreground">
                                <p className="text-sm">No chats yet</p>
                                <p className="text-xs mt-1">Start a new conversation!</p>
                            </div>
                        ) : (
                            <div className="p-2 md:p-3 space-y-1.5 md:space-y-2">
                                {savedChats.map((chat) => (
                                    <ContextMenu.Root key={chat.id}>
                                        <ContextMenu.Trigger className="w-full" disabled={!isAuthenticated}>
                                            <div
                                                className={`relative group px-3 py-2.5 md:px-4 md:py-3 rounded-lg cursor-pointer flex items-center transition-colors duration-150
                                                ${chat.id === currentChatId ? 'bg-accent shadow-sm' : 'hover:bg-accent/50'}`}
                                                onClick={() => switchChat(chat.id)}
                                            >
                                                <div className="flex-1 min-w-0 mr-2">
                                                    <TooltipProvider delayDuration={300}>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span className={`block text-sm truncate ${chat.id === currentChatId ? 'font-semibold text-accent-foreground' : 'text-foreground'}`}>
                                                                    {chat.title}
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="right" className="max-w-[250px] break-words" sideOffset={5}>
                                                                {chat.title}
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                    <span className="text-xs text-muted-foreground truncate block mt-0.5">
                                                        {new Date(chat.updatedAt).toLocaleDateString()} · {chat.messages.filter(m => m.role === 'user' || m.role === 'assistant').length} msg
                                                    </span>
                                                </div>
                                                <AuthenticatedActionButton
                                                    variant="ghost"
                                                    size="icon"
                                                    className={`h-6 w-6 shrink-0 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity text-muted-foreground hover:text-destructive`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setChatToDelete(chat.id);
                                                    }}
                                                    title="Delete chat"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </AuthenticatedActionButton>
                                            </div>
                                        </ContextMenu.Trigger>
                                        <ContextMenu.Content className="min-w-[160px] bg-popover text-popover-foreground rounded-md border shadow-md p-1 z-50">
                                            <ContextMenu.Item
                                                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent focus:bg-accent hover:text-accent-foreground focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                                onSelect={() => {
                                                    setChatToRename(chat.id);
                                                    setNewChatTitle(chat.title);
                                                }}
                                                disabled={!isAuthenticated}
                                            >
                                                Rename
                                            </ContextMenu.Item>
                                            <ContextMenu.Item
                                                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-destructive focus:bg-destructive hover:text-destructive-foreground focus:text-destructive-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                                onSelect={() => setChatToDelete(chat.id)}
                                                disabled={!isAuthenticated}
                                            >
                                                Delete
                                            </ContextMenu.Item>
                                        </ContextMenu.Content>
                                    </ContextMenu.Root>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </div>

            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="sticky top-0 z-10 h-16 border-b bg-background/95 backdrop-blur-sm flex items-center justify-between px-4 md:px-6">
                    <div className="flex items-center gap-2 md:gap-3">
                        {isMobile ? (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowMobileMenu(true)}
                                className="text-primary hover:bg-primary/10 rounded-full h-9 w-9"
                            >
                                <Menu className="h-5 w-5" />
                            </Button>
                        ) : (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.push('/')}
                                className="text-primary hover:bg-primary/10 rounded-full h-9 w-9"
                                title="Back to Dashboard"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        )}
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold">AI Assistant</h2>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <span className="inline-flex items-center rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive ring-1 ring-inset ring-destructive/20">
                                            Alpha
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                        <p className="max-w-xs">This is a rough Alpha version. Features and performance may change significantly.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3">
                        {isNonGlobalSpace && !isInitializing && (
                            <>
                                <TooltipProvider delayDuration={200}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <AuthenticatedActionButton
                                                variant="ghost"
                                                className={`flex items-center gap-1.5 cursor-pointer transition-colors p-1.5 rounded-full ${isMobile ? '' : 'hover:bg-accent'}`}
                                                onClick={() => setShowDiscourseDialog(true)}
                                                role="button"
                                            >
                                                {isCheckingDiscourse ? (
                                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                                ) : connectionStatus === 'connected' ? (
                                                    <CircleDotIcon className="h-4 w-4 text-green-500" />
                                                ) : connectionStatus === 'partially_connected' ? (
                                                    <CircleDotIcon className="h-4 w-4 text-yellow-500" />
                                                ) : connectionStatus === 'pending' ? (
                                                    <CircleDotIcon className="h-4 w-4 text-blue-500" />
                                                ) : connectionStatus === 'unavailable_logged_out' ? (
                                                    <CircleIcon className="h-4 w-4 text-gray-500" />
                                                ) : (
                                                    <CircleIcon className="h-4 w-4 text-muted-foreground" />
                                                )}
                                                <span className="text-xs font-medium mr-1">
                                                    {isCheckingDiscourse ? 'Checking' :
                                                        connectionStatus === 'connected' ? 'Connected' :
                                                            connectionStatus === 'partially_connected' ? 'Messages Stored' :
                                                                connectionStatus === 'pending' ? 'Pending Fetch' :
                                                                    connectionStatus === 'unavailable_logged_out' ? 'Login Required' :
                                                                        'Not Connected'}
                                                </span>
                                            </AuthenticatedActionButton>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom">
                                            {isCheckingDiscourse ? 'Checking Discourse connection...' :
                                                connectionStatus === 'connected' ? `Connected as ${discourseUsername}` :
                                                    connectionStatus === 'partially_connected' ? 'Stored messages found. Connect to update.' :
                                                        connectionStatus === 'pending' ? 'Ready to fetch messages. Click settings to connect.' :
                                                            connectionStatus === 'unavailable_logged_out' ? 'Login required to connect Discourse' :
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
                    ) : chatMessages.length === 0 ? (
                        <div className="h-full flex items-center justify-center p-4 md:p-6">
                            <div className="max-w-2xl w-full space-y-6 md:space-y-8">
                                <div className="text-center space-y-1">
                                    <h2 className="text-xl md:text-2xl font-bold">How can I help?</h2>
                                    <p className="text-muted-foreground text-sm">Select an option or start typing below</p>
                                </div>
                                <div className="grid gap-3 md:gap-4 sm:grid-cols-2">
                                    <AuthenticatedActionButton
                                        variant="outline"
                                        className="h-auto min-h-[7rem] md:min-h-[8rem] flex flex-col items-center justify-center gap-1.5 p-3 md:p-4 text-center rounded-lg hover:bg-accent focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2"
                                        onClick={() => startChatWithOption('distill')}
                                        disabled={isGenerating || userRationales.length === 0}
                                    >
                                        <div className="text-base md:text-lg font-semibold">Distill Rationales</div>
                                        <p className="text-xs md:text-sm text-muted-foreground text-balance">
                                            {userRationales.length === 0
                                                ? "You don't have any rationales yet."
                                                : "Organize your existing rationales into an essay."}
                                        </p>
                                    </AuthenticatedActionButton>
                                    <Button
                                        variant="outline"
                                        className="h-auto min-h-[7rem] md:min-h-[8rem] flex flex-col items-center justify-center gap-1.5 p-3 md:p-4 text-center rounded-lg hover:bg-accent focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 opacity-50 cursor-not-allowed"
                                        disabled
                                        aria-disabled="true"
                                    >
                                        <div className="text-base md:text-lg font-semibold">Build from Posts</div>
                                        <p className="text-xs md:text-sm text-muted-foreground text-balance">
                                            Create rationales from your forum posts.
                                        </p>
                                        <span className="text-xs text-primary font-medium mt-1">Coming Soon</span>
                                    </Button>
                                </div>
                                <p className="text-center text-xs text-muted-foreground">Or, just type your message below to start a general chat.</p>
                            </div>
                        </div>
                    ) : (
                        <ScrollArea className="h-full" id="chat-scroll-area">
                            <div className={`space-y-4 md:space-y-6 py-4 md:py-6 px-2 md:px-4 lg:max-w-3xl xl:max-w-4xl mx-auto`}>
                                {chatMessages.map((msg, i) => (
                                    <div
                                        key={`${currentChatId || 'nochat'}-${i}`}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`${isMobile ? 'max-w-[90%]' : 'max-w-[80%]'} rounded-xl md:rounded-2xl p-3 md:p-4 shadow-sm ${msg.role === 'user'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-card text-card-foreground'
                                                } relative group [&_.markdown]:text-sm [&_.markdown]:md:text-base`}
                                        >
                                            <MemoizedMarkdown content={msg.content} id={`msg-${i}`} isUserMessage={msg.role === 'user'} />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute bottom-1 right-1 h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-70 focus-visible:opacity-100 hover:opacity-100 transition-opacity duration-150"
                                                onClick={async (e) => {
                                                    const button = e.currentTarget;
                                                    try {
                                                        await navigator.clipboard.writeText(msg.content);
                                                        button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3 w-3 text-green-500"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                                                        setTimeout(() => {
                                                            button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3 w-3"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>';
                                                        }, 1500);
                                                    } catch (err) {
                                                        console.error("Failed to copy:", err);
                                                        toast.error("Failed to copy text");
                                                    }
                                                }}
                                                title="Copy message"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                                                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                                                </svg>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {streamingContent && (
                                    <div className="flex justify-start">
                                        <div className={`${isMobile ? 'max-w-[90%]' : 'max-w-[80%]'} rounded-xl md:rounded-2xl p-3 md:p-4 shadow-sm bg-card text-card-foreground mr-4 [&_.markdown]:text-sm [&_.markdown]:md:text-base`}>
                                            <MemoizedMarkdown content={streamingContent + " ▋"} id="streaming" />
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} className="h-1" />
                            </div>
                        </ScrollArea>
                    )}
                </div>

                <div className={`flex-shrink-0 border-t bg-background ${isMobile ? 'p-2' : 'p-4'}`}>
                    <form className={`w-full lg:max-w-3xl xl:max-w-4xl mx-auto flex items-end gap-2 md:gap-3`} onSubmit={handleSubmit}>
                        <AutosizeTextarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={!isAuthenticated ? "Login to chat..." : isGenerating ? "Waiting for response..." : "Type your message here... (Ctrl+Enter to send)"}
                            className="flex-1 py-2.5 px-3 md:px-4 text-[11px] sm:text-sm md:text-base rounded-lg border shadow-sm resize-none focus-visible:ring-1 focus-visible:ring-ring"
                            disabled={isGenerating || isInitializing || !currentSpace || !isAuthenticated}
                            style={{
                                minHeight: '40px',
                                maxHeight: isMobile ? '100px' : '160px'
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                    e.preventDefault();
                                    handleSubmit(e as any);
                                }
                            }}
                        />
                        <AuthenticatedActionButton
                            type="submit"
                            disabled={isGenerating || !message.trim() || !currentSpace || isInitializing}
                            rightLoading={isGenerating}
                            className="rounded-lg h-10 px-4"
                            title="Send Message (Ctrl+Enter)"
                        >
                            {isGenerating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                                </svg>
                            )}
                        </AuthenticatedActionButton>
                        <AuthenticatedActionButton
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowSettingsDialog(true)}
                            className="rounded-lg h-10 w-10 text-muted-foreground hover:text-foreground"
                            title="Chat Settings"
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                        </AuthenticatedActionButton>
                    </form>
                </div>
            </div>

            {isNonGlobalSpace && (
                <>
                    <DiscourseConnectDialog
                        isOpen={showDiscourseDialog}
                        onOpenChange={setShowDiscourseDialog}
                        isMobile={isMobile}
                        connectionStatus={connectionStatus}
                        discourseUsername={discourseUsername}
                        setDiscourseUsername={setDiscourseUsername}
                        storedMessages={storedMessages}
                        isConnectingToDiscourse={isConnectingToDiscourse}
                        fetchProgress={fetchProgress}
                        error={error}
                        handleConnect={handleConnectToDiscourse}
                        handleViewMessages={handleViewMessages}
                        handleDeleteMessages={handleDeleteMessages}
                    />
                    <DiscourseMessagesDialog
                        isOpen={showMessagesModal}
                        onOpenChange={setShowMessagesModal}
                        messages={storedMessages}
                    />
                    <DiscourseConsentDialog
                        isOpen={showConsentDialog}
                        onOpenChange={setShowConsentDialog}
                        onConfirm={handleConsentAndConnect}
                        isLoading={isUpdatingConsent}
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

            <AlertDialog open={!!chatToDelete} onOpenChange={(open) => !open && setChatToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Chat</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this chat ({savedChats.find(c => c.id === chatToDelete)?.title || ''})? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AuthenticatedActionButton
                            onClick={() => {
                                if (chatToDelete) {
                                    deleteChat(chatToDelete);
                                }
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AuthenticatedActionButton>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={chatToRename !== null} onOpenChange={(open) => !open && setChatToRename(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Rename Chat</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        if (chatToRename) {
                            renameChat(chatToRename, newChatTitle);
                        }
                    }}>
                        <div className="grid gap-4 py-4">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="name" className="text-sm">Chat Name</Label>
                                <Input
                                    id="name"
                                    value={newChatTitle}
                                    onChange={(e) => setNewChatTitle(e.target.value)}
                                    placeholder="Enter new chat name"
                                    autoComplete="off"
                                    maxLength={50}
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-end space-x-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setChatToRename(null)}>
                                Cancel
                            </Button>
                            <AuthenticatedActionButton type="submit" disabled={!newChatTitle.trim()}>
                                Save
                            </AuthenticatedActionButton>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

        </div>
    );
} 