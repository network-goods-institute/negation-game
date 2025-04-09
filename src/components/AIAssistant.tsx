"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ArrowLeft, Trash2, MessageSquare, Settings2, CircleIcon, CircleDotIcon, Plus, Menu, X, SlidersHorizontal } from "lucide-react";
import { useUser } from "@/queries/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { updateUserProfile } from "@/actions/updateUserProfile";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { userQueryKey } from "@/queries/useUser";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { generateChatBotResponse, EndorsedPoint } from "@/actions/generateChatBotResponse";
import { nanoid } from "nanoid";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { MemoizedMarkdown } from "@/components/ui/MemoizedMarkdown";
import { AuthenticatedActionButton } from "@/components/ui/AuthenticatedActionButton";
import { fetchUserEndorsedPoints } from "@/actions/fetchUserEndorsedPoints";
import { getSpace } from "@/actions/getSpace";
import { Skeleton } from "./ui/skeleton";
import { AutosizeTextarea } from "./ui/autosize-textarea";
import { fetchUserViewpoints } from "@/actions/fetchUserViewpoints";
import { generateChatName } from "@/actions/generateChatName";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

import { Switch } from "@/components/ui/switch";

interface DiscourseMessage {
    id: number;
    content: string;
    raw: string;
    created_at: string;
    topic_id?: number;
    topic_title?: string;
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

interface ChatRationale {
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

interface ChatSettings {
    includeEndorsements: boolean;
    includeRationales: boolean;
    includePoints: boolean;
    includeDiscourseMessages: boolean;
}

type DiscourseConnectionStatus =
    | 'disconnected'        // No credentials, no messages
    | 'connected'          // Has valid credentials and messages
    | 'partially_connected' // Has messages but no/invalid credentials
    | 'pending'           // Has credentials but no messages yet

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

export default function AIAssistant() {
    const router = useRouter();
    const { user: privyUser } = usePrivy();
    const { data: userData } = useUser(privyUser?.id);
    const queryClient = useQueryClient();
    const isMobile = useIsMobile();

    // loading states
    const [isInitializing, setIsInitializing] = useState(true);
    const [isCheckingDiscourse, setIsCheckingDiscourse] = useState(true);

    // Discourse-related state
    const [showDiscourseDialog, setShowDiscourseDialog] = useState(false);
    const [isConnectingToDiscourse, setIsConnectingToDiscourse] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [discourseUsername, setDiscourseUsername] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('discourse_username') || '';
        }
        return '';
    });
    const [discourseUrl, setDiscourseUrl] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('discourse_url') || 'https://forum.scroll.io';
        }
        return 'https://forum.scroll.io';
    });
    const [storedMessages, setStoredMessages] = useState<DiscourseMessage[]>([]);
    const [showMessagesModal, setShowMessagesModal] = useState(false);
    const [showConsentDialog, setShowConsentDialog] = useState(false);
    const [hasStoredMessages, setHasStoredMessages] = useState(false);
    const [fetchProgress, setFetchProgress] = useState(0);
    const [endorsedPoints, setEndorsedPoints] = useState<EndorsedPoint[]>([]);
    const [userRationales, setUserRationales] = useState<ChatRationale[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<DiscourseConnectionStatus>('disconnected');

    // Chat-related state
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
    const [showSidebar, _] = useState(true);
    const [message, setMessage] = useState('');
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{
        role: 'assistant',
        content: `Hello! I'm here to help you write your rationale description or discuss your points. What topic should we explore?`
    }]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);
    const [chatToDelete, setChatToDelete] = useState<string | null>(null);
    const [chatToRename, setChatToRename] = useState<string | null>(null);
    const [newChatTitle, setNewChatTitle] = useState('');

    const [currentSpace, setCurrentSpace] = useState<string | null>(null);

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

    const [isUpdatingConsent, setIsUpdatingConsent] = useState(false);

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

                const points = await fetchUserEndorsedPoints();
                setEndorsedPoints(points || []);

                const rationales = await fetchUserViewpoints();
                const convertedRationales: ChatRationale[] = (rationales || []).map(r => ({
                    id: r.id,
                    title: r.title,
                    description: r.description,
                    author: r.author,
                    graph: {
                        nodes: r.graph.nodes.map(n => ({
                            id: n.id,
                            type: n.type as "point" | "statement" | "addPoint",
                            data: {
                                content: n.type === 'point' && 'data' in n && 'content' in n.data ? String(n.data.content) : undefined,
                                statement: n.type === 'statement' && 'data' in n && 'statement' in n.data ? String(n.data.statement) : undefined,
                                pointId: n.type === 'point' && 'data' in n && 'pointId' in n.data ? Number(n.data.pointId) : undefined
                            }
                        })),
                        edges: r.graph.edges.map(e => ({
                            id: e.id,
                            type: e.type || 'default',
                            source: e.source,
                            target: e.target
                        }))
                    },
                    statistics: r.statistics
                }));
                setUserRationales(convertedRationales);

                const savedChatsStr = space ? localStorage.getItem(`saved_chats_${space}`) : null;
                if (savedChatsStr) {
                    const chats = JSON.parse(savedChatsStr);
                    setSavedChats(chats);
                    if (chats.length > 0) {
                        setCurrentChatId(chats[0].id);
                        setChatMessages(chats[0].messages);
                    }
                }
            } catch (error) {
                console.error('Error initializing assistant:', error);
                setCurrentSpace('global');
            } finally {
                setIsInitializing(false);
            }
        };

        initializeAssistant();
    }, []);

    const createNewChat = useCallback(() => {
        if (!currentSpace) {
            console.error('Cannot create chat: No space selected');
            return;
        }

        const newChatId = nanoid();
        const newChat: SavedChat = {
            id: newChatId,
            title: 'New Chat',
            messages: [{
                role: 'assistant',
                content: `Hello! I'm here to help you write your rationale description or discuss your points. What topic should we explore?`
            }],
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
        setChatMessages(newChat.messages);
    }, [currentSpace]);

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

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!message.trim() || isGenerating) return;

        const newMessage: ChatMessage = { role: 'user', content: message };

        // Check if this is a new chat - only one message and it's the initial bot message
        const isNewChat = !currentChatId &&
            chatMessages.length === 1 &&
            chatMessages[0].role === 'assistant' &&
            chatMessages[0].content === `Hello! I'm here to help you write your rationale description or design your graph. What topic should we explore?`;

        // Create new chat if needed
        let activeChatId = currentChatId;
        if (isNewChat) {
            activeChatId = nanoid();
            const newChat: SavedChat = {
                id: activeChatId,
                title: 'New Chat',
                messages: [...chatMessages, newMessage],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                space: currentSpace || 'default'
            };
            setSavedChats(prev => [newChat, ...prev]);
            setCurrentChatId(activeChatId);
            if (currentSpace) {
                localStorage.setItem(`saved_chats_${currentSpace}`, JSON.stringify([newChat, ...savedChats]));
            }
        }

        // Update messages
        const updatedMessages = [...chatMessages, newMessage];
        setChatMessages(updatedMessages);
        if (activeChatId) {
            updateChat(activeChatId, updatedMessages);
        }

        setMessage('');
        setIsGenerating(true);
        setStreamingContent('');

        try {
            const systemMessages: ChatMessage[] = settings.includeDiscourseMessages ? storedMessages.map(msg => ({
                role: 'system',
                content: `From forum post "${msg.topic_title || 'Untitled'}": ${msg.content}`
            })) : [];

            const response = await generateChatBotResponse(
                [...systemMessages, ...updatedMessages],
                settings.includeEndorsements && settings.includePoints ? endorsedPoints : undefined,
                settings.includeRationales ? userRationales : undefined
            );

            if (!response) throw new Error("Failed to get response");

            let content = '';
            let inCodeBlock = false;
            let codeBlockContent = '';
            let codeBlockLanguage = '';
            let lastChunkEndedWithNewline = false;
            let lastChunkStartedWithHash = false;
            let lastChunkWasSpace = false;

            for await (const chunk of response) {
                if (!chunk) continue;

                // Handle code block boundaries
                if (chunk.includes('```')) {
                    const parts = chunk.split('```');
                    parts.forEach((part, i) => {
                        if (i === 0 && !inCodeBlock) {
                            // Add spacing before code block if needed
                            if (content && !content.endsWith('\n\n')) {
                                content += '\n\n';
                            }
                            content += part;
                        } else if (inCodeBlock) {
                            codeBlockContent += part;
                            inCodeBlock = false;
                            content += '```' + codeBlockLanguage + '\n' + codeBlockContent + '```\n\n';
                            codeBlockContent = '';
                            codeBlockLanguage = '';
                        } else {
                            inCodeBlock = true;
                            const lines = part.split('\n');
                            codeBlockLanguage = lines[0];
                            codeBlockContent = lines.slice(1).join('\n');
                        }
                    });
                } else {
                    if (inCodeBlock) {
                        codeBlockContent += chunk;
                    } else {
                        let processedChunk = chunk;
                        const startsWithHash = chunk.trimStart().startsWith('#');
                        const endsWithNewline = chunk.endsWith('\n');
                        const isNewline = chunk.trim() === '';
                        const isSpace = /^\s+$/.test(chunk);
                        const isStartOfSentence = /^[A-Z]/.test(chunk.trimStart());

                        // Don't add extra space if this chunk is just whitespace
                        if (isSpace) {
                            lastChunkWasSpace = true;
                            continue;
                        }

                        // Add spacing around headers
                        if (startsWithHash && !lastChunkEndedWithNewline && content) {
                            content += '\n\n';
                        }

                        // Add spacing after headers
                        if (lastChunkStartedWithHash && !startsWithHash && !chunk.startsWith('\n')) {
                            processedChunk = '\n' + processedChunk;
                        }

                        // Add space between sentences
                        if (isStartOfSentence && content && !content.endsWith('\n') && !lastChunkEndedWithNewline && !lastChunkWasSpace) {
                            content += ' ';
                        }

                        // Handle list items
                        if (chunk.trimStart().startsWith('- ') && !lastChunkEndedWithNewline && content) {
                            content += '\n';
                        }

                        // Add the chunk
                        content += processedChunk;

                        // Update state for next chunk
                        lastChunkEndedWithNewline = endsWithNewline;
                        lastChunkStartedWithHash = startsWithHash;
                        lastChunkWasSpace = false;
                    }
                }
                setStreamingContent(content);
            }

            // Final cleanup - ensure proper spacing at the end
            if (content.endsWith('\n\n\n')) {
                content = content.slice(0, -1);
            }

            const assistantMessage: ChatMessage = { role: 'assistant', content };
            const finalMessages = [...updatedMessages, assistantMessage];
            setChatMessages(finalMessages);
            setStreamingContent('');

            // Generate chat name after first exchange if it's still "New Chat"
            if (isNewChat || (activeChatId && savedChats.find(c => c.id === activeChatId)?.title === 'New Chat')) {
                try {
                    const stream = await generateChatName(finalMessages);
                    if (!stream) {
                        throw new Error("Failed to get title stream");
                    }

                    let title = "";
                    for await (const chunk of stream) {
                        if (!chunk) continue;
                        title += chunk;
                    }

                    title = title.trim();

                    if (title && activeChatId) {
                        const finalTitle = title.slice(0, 30);
                        updateChat(activeChatId, finalMessages, finalTitle);
                    } else {
                        const userMessage = finalMessages.find(m => m.role === 'user')?.content || '';
                        const fallbackTitle = userMessage.slice(0, 27) + (userMessage.length > 27 ? '...' : '');
                        if (activeChatId) {
                            updateChat(activeChatId, finalMessages, fallbackTitle);
                        }
                    }
                } catch (error) {
                    console.error("Error generating chat name:", error);
                    const userMessage = finalMessages.find(m => m.role === 'user')?.content || '';
                    const fallbackTitle = userMessage.slice(0, 27) + (userMessage.length > 27 ? '...' : '');
                    if (activeChatId) {
                        updateChat(activeChatId, finalMessages, fallbackTitle);
                    }
                }
            } else if (activeChatId) {
                updateChat(activeChatId, finalMessages);
            }

        } catch (error) {
            console.error('Error generating response:', error);
            const errorMessage: ChatMessage = {
                role: 'assistant',
                content: 'I apologize, but I encountered an error. Please try again.'
            };
            const errorMessages = [...updatedMessages, errorMessage];
            setChatMessages(errorMessages);
            if (activeChatId) {
                updateChat(activeChatId, errorMessages);
            }
        } finally {
            setIsGenerating(false);
            setStreamingContent('');
        }
    };

    const deleteChat = useCallback((chatId: string) => {
        if (!currentSpace) return;

        const updatedChats = savedChats.filter(chat => chat.id !== chatId);
        setSavedChats(updatedChats);
        localStorage.setItem(`saved_chats_${currentSpace}`, JSON.stringify(updatedChats));

        // If we're deleting the current chat or there are no chats left
        if (chatId === currentChatId || updatedChats.length === 0) {
            setCurrentChatId(null);
            setChatMessages([{
                role: 'assistant',
                content: `Hello! I'm here to help you write your rationale description or discuss your points. What topic should we explore?`
            }]);
        } else if (currentChatId === null && updatedChats.length > 0) {
            // If we somehow have no current chat but there are chats available
            setCurrentChatId(updatedChats[0].id);
            setChatMessages(updatedChats[0].messages);
        }

        setChatToDelete(null);
    }, [currentSpace, currentChatId, savedChats]);

    const switchChat = useCallback((chatId: string) => {
        const chat = savedChats.find(c => c.id === chatId);
        if (chat) {
            setCurrentChatId(chatId);
            setChatMessages(chat.messages);
        }
    }, [savedChats]);

    const renameChat = useCallback((chatId: string, newTitle: string) => {
        if (!newTitle.trim() || !currentSpace) return;

        setSavedChats(prev => {
            const updated = prev.map(chat =>
                chat.id === chatId ? { ...chat, title: newTitle.trim() } : chat
            );
            localStorage.setItem(`saved_chats_${currentSpace}`, JSON.stringify(updated));
            return updated;
        });

        setChatToRename(null);
        setNewChatTitle('');
    }, [currentSpace]);

    useEffect(() => {
        const checkStoredMessages = () => {
            setIsCheckingDiscourse(true);
            try {
                if (typeof window !== 'undefined') {
                    const storedData = localStorage.getItem('discourse_messages');
                    if (storedData) {
                        const messages = JSON.parse(storedData);
                        if (Array.isArray(messages) && messages.length > 0) {
                            setStoredMessages(messages);
                            setHasStoredMessages(true);
                        } else {
                            setHasStoredMessages(false);
                        }
                    } else {
                        setHasStoredMessages(false);
                    }
                }
            } catch (error) {
                console.error("Error checking stored messages:", error);
                setHasStoredMessages(false);
            } finally {
                setIsCheckingDiscourse(false);
            }
        };

        checkStoredMessages();
    }, []);

    const loadStoredMessages = () => {
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
            return [];
        } catch (error) {
            console.error("Error parsing stored messages:", error);
            return [];
        }
    };

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

    const handleViewMessages = () => {
        try {
            const messages = loadStoredMessages();

            setStoredMessages(messages);

            if (messages.length > 0) {
                setShowMessagesModal(true);
            } else {
                toast.error('No messages found. Please connect to Discourse first.');
            }
        } catch (error) {
            console.error("Error loading messages:", error);
            toast.error('Error loading messages from storage');
        }
    };

    const handleDeleteMessages = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('discourse_messages');
            setStoredMessages([]);
            setHasStoredMessages(false);
            toast.success('Messages deleted successfully');
        }
    };

    const handleUpdateProfile = useCallback(async (values: {
        discourseUsername: string;
        discourseCommunityUrl: string;
        discourseConsentGiven: boolean;
    }) => {
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
                    queryClient.invalidateQueries({ queryKey: ["user"] });
                }
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Failed to update profile:', error);
            throw error;
        }
    }, [privyUser, queryClient]);

    const handleConnectToDiscourse = useCallback(async () => {
        if (isConnectingToDiscourse) return;

        try {
            if (!discourseUsername.trim()) {
                setError('Please enter your username');
                return;
            }

            if (!userData) {
                setError('User data not loaded yet. Please try again (are you logged in?).');
                return;
            }

            // If we don't have consent, show the consent dialog
            if (!userData.discourseConsentGiven) {
                setShowConsentDialog(true);
                return;
            }

            setIsConnectingToDiscourse(true);
            setError(null);
            setFetchProgress(10);

            const cleanUrl = discourseUrl.trim().replace(/\/$/, '');
            const encodedUrl = encodeURIComponent(cleanUrl);

            if (userData.discourseUsername !== discourseUsername ||
                userData.discourseCommunityUrl !== cleanUrl ||
                !userData.discourseConsentGiven) {
                await handleUpdateProfile({
                    discourseUsername: discourseUsername,
                    discourseCommunityUrl: cleanUrl,
                    discourseConsentGiven: true,
                });
            }

            setFetchProgress(20);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000);

            const eventSource = new EventSource(`/api/discourse/posts/stream?username=${encodeURIComponent(discourseUsername)}&url=${encodedUrl}`);

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.progress) {
                        setFetchProgress(20 + (data.progress * 0.7));
                    }
                    if (data.done) {
                        eventSource.close();
                    }
                } catch (e) {
                    console.error("Error parsing SSE message:", e);
                }
            };

            eventSource.onerror = () => {
                eventSource.close();
            };

            const response = await fetch(`/api/discourse/posts?username=${encodeURIComponent(discourseUsername)}&url=${encodedUrl}`, {
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            eventSource.close();
            setFetchProgress(90);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch user messages');
            }

            const data = await response.json();
            let rawPosts = [];
            if (data.latest_posts && Array.isArray(data.latest_posts)) {
                rawPosts = data.latest_posts;
            } else if (Array.isArray(data)) {
                rawPosts = data;
            } else {
                throw new Error('Invalid response structure from API');
            }

            if (!Array.isArray(rawPosts)) {
                throw new Error('Invalid response format from API');
            }

            setFetchProgress(95);
            const processedMessages: DiscourseMessage[] = rawPosts.map((msg: any) => ({
                id: msg.id || Math.random().toString(36).substring(2, 11),
                content: msg.content || msg.cooked || '',
                raw: msg.raw || '',
                created_at: msg.created_at || new Date().toISOString(),
                topic_id: msg.topic_id || '',
                topic_title: msg.topic_title || msg.topic_slug || ''
            }));

            if (processedMessages.length > 0) {
                saveMessagesToStorage(processedMessages);
                toast.success(`Successfully connected to Discourse! Found ${processedMessages.length} messages.`);
            } else {
                toast.info('Connected to Discourse, but no messages found for this username.');
            }

            setShowDiscourseDialog(false);

        } catch (error) {
            setError('Failed to fetch messages. Please check the username and try again.');
            console.error("handleConnectToDiscourse Error:", error);
        } finally {
            setIsConnectingToDiscourse(false);
            setTimeout(() => setFetchProgress(0), 1000);
        }
    }, [discourseUsername, discourseUrl, userData, handleUpdateProfile, saveMessagesToStorage, isConnectingToDiscourse]);

    const handleConsentAndConnect = async () => {
        if (isUpdatingConsent) return;

        try {
            setIsUpdatingConsent(true);
            // Ensure user data is available before updating profile
            if (!userData) {
                toast.error('User data not available. Cannot grant consent.');
                console.error('handleConsentAndConnect: userData is null.');
                setShowConsentDialog(false);
                return;
            }

            console.log('handleConsentAndConnect: Granting consent and updating profile.');
            await handleUpdateProfile({
                discourseUsername,
                discourseCommunityUrl: discourseUrl,
                discourseConsentGiven: true,
            });
            setShowConsentDialog(false);

            if (privyUser?.id) {
                await queryClient.invalidateQueries({ queryKey: userQueryKey(privyUser.id) });
            }
            handleConnectToDiscourse(); // Re-attempt connection
        } catch (error) {
            console.error('Failed to update consent:', error);
            toast.error('Failed to update consent settings');
        } finally {
            setIsUpdatingConsent(false);
        }
    };

    useEffect(() => {
        if (isCheckingDiscourse) return;

        if (storedMessages.length > 0) {
            if (discourseUsername.trim() && discourseUrl.trim()) {
                setConnectionStatus('connected');
            } else {
                setConnectionStatus('partially_connected');
            }
        } else if (discourseUsername.trim() && discourseUrl.trim()) {
            setConnectionStatus('pending');
        } else {
            setConnectionStatus('disconnected');
        }
    }, [isCheckingDiscourse, storedMessages.length, discourseUsername, discourseUrl]);

    useEffect(() => {
        if (userData?.discourseUsername && !discourseUsername) {
            setDiscourseUsername(userData.discourseUsername);
            if (typeof window !== 'undefined') {
                localStorage.setItem('discourse_username', userData.discourseUsername);
            }
        }
        if (userData?.discourseCommunityUrl && !discourseUrl) {
            setDiscourseUrl(userData.discourseCommunityUrl);
            if (typeof window !== 'undefined') {
                localStorage.setItem('discourse_url', userData.discourseCommunityUrl);
            }
        }
    }, [userData, discourseUsername, discourseUrl]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('discourse_username', discourseUsername);
        }
    }, [discourseUsername]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('discourse_url', discourseUrl);
        }
    }, [discourseUrl]);

    return (
        <div className="flex h-[calc(100vh-var(--header-height))]">
            {/* Sidebar - Hidden on mobile by default */}
            <div className={`${isMobile ? 'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm' : 'w-72 border-r bg-background/90 flex-shrink-0'} 
                ${(showSidebar && (!isMobile || showMobileMenu)) ? '' : 'hidden'}`}>
                <div className={`${isMobile ? 'fixed inset-x-0 bottom-0 top-auto h-[80vh] rounded-t-xl shadow-lg bg-background border-t' : 'h-full'}`}>
                    <div className="h-16 border-b flex items-center justify-between px-6">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-primary" />
                            Chats
                        </h2>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                    createNewChat();
                                }}
                                title="New Chat"
                                className="rounded-full h-9 w-9"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                            {isMobile && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowMobileMenu(false)}
                                    className="rounded-full h-9 w-9"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                    <ScrollArea className={`${isMobile ? 'h-[calc(80vh-4rem)]' : 'h-[calc(100vh-var(--header-height)-4rem)]'}`}>
                        {isInitializing ? (
                            <ChatListSkeleton />
                        ) : savedChats.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <p className="text-sm">No chats yet</p>
                                <p className="text-xs mt-1">Start a new conversation</p>
                            </div>
                        ) : (
                            <div className="p-3 space-y-2.5">
                                {savedChats.map((chat) => (
                                    <ContextMenu.Root key={chat.id}>
                                        <ContextMenu.Trigger className="w-full">
                                            <div
                                                className={`relative group px-4 py-3 rounded-xl cursor-pointer hover:bg-accent flex items-center transition-colors 
                                                ${chat.id === currentChatId ? 'bg-accent/70 shadow-sm' : 'hover:bg-accent/30'}`}
                                                onClick={() => switchChat(chat.id)}
                                            >
                                                <div className="flex-1 min-w-0 mr-4">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="max-w-[160px]">
                                                                    <span className={`block truncate ${chat.id === currentChatId ? 'font-medium' : ''}`}>
                                                                        {isMobile ?
                                                                            (chat.title.length > 30 ? chat.title.slice(0, 30) + '...' : chat.title) :
                                                                            chat.title
                                                                        }
                                                                    </span>
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="right" className="max-w-[300px] break-words">
                                                                {chat.title}
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                    <span className="text-xs text-muted-foreground truncate block mt-0.5">
                                                        {new Date(chat.updatedAt).toLocaleDateString()} · {chat.messages.length - 1} messages
                                                    </span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setChatToDelete(chat.id);
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </ContextMenu.Trigger>
                                        <ContextMenu.Content className="min-w-[160px] bg-popover text-popover-foreground rounded-md border shadow-md p-1 z-50">
                                            <ContextMenu.Item
                                                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                                onSelect={() => {
                                                    setChatToRename(chat.id);
                                                    setNewChatTitle(chat.title);
                                                }}
                                            >
                                                Rename
                                            </ContextMenu.Item>
                                            <ContextMenu.Item
                                                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-destructive hover:text-destructive-foreground"
                                                onSelect={() => setChatToDelete(chat.id)}
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

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="sticky top-0 z-10 h-16 border-b bg-background/90 backdrop-blur-sm flex items-center justify-between px-6">
                    <div className="flex items-center gap-3">
                        {isMobile ? (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowMobileMenu(true)}
                                className="text-primary hover:bg-primary/10"
                            >
                                <Menu className="h-5 w-5" />
                            </Button>
                        ) : (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.push('/')}
                                className="text-primary hover:bg-primary/10"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        )}
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold">AI Assistant</h2>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <span className="inline-flex items-center rounded-md bg-red-900/10 px-2 py-1 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-400/20">
                                            Alpha
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="max-w-xs">This is a rough Alpha version of the chatbot, and is in no way indicative of final form. Please use with caution. We are working on new features and improvements currently!</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Connection status - compact on mobile */}
                        <div
                            className={`flex items-center gap-2 ${isMobile ? 'bg-transparent p-0' : 'bg-background/80 py-1.5 px-3 rounded-full border'} cursor-pointer hover:bg-accent/50 transition-colors`}
                            onClick={() => setShowDiscourseDialog(true)}
                            role="button"
                            title="Open Discourse Settings"
                        >
                            {isCheckingDiscourse ? (
                                <div className="flex items-center gap-1.5">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    {!isMobile && <span className="text-sm text-muted-foreground">Checking...</span>}
                                </div>
                            ) : connectionStatus === 'connected' ? (
                                <div className="flex items-center gap-1.5">
                                    <CircleDotIcon className="h-3.5 w-3.5 text-green-500" />
                                    {!isMobile && <span className="text-sm">Connected</span>}
                                </div>
                            ) : connectionStatus === 'partially_connected' ? (
                                <div className="flex items-center gap-1.5">
                                    <CircleDotIcon className="h-3.5 w-3.5 text-yellow-500" />
                                    {!isMobile && <span className="text-sm">Partially Connected</span>}
                                </div>
                            ) : connectionStatus === 'pending' ? (
                                <div className="flex items-center gap-1.5">
                                    <CircleDotIcon className="h-3.5 w-3.5 text-blue-500" />
                                    {!isMobile && <span className="text-sm">Pending</span>}
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5">
                                    <CircleIcon className="h-3.5 w-3.5" />
                                    {!isMobile && <span className="text-sm text-muted-foreground">Not Connected</span>}
                                </div>
                            )}
                        </div>
                        <AuthenticatedActionButton
                            variant="outline"
                            size="icon"
                            onClick={() => setShowDiscourseDialog(true)}
                            className="rounded-full h-9 w-9"
                            title="Connect Discourse"
                        >
                            <Settings2 className="h-4 w-4" />
                        </AuthenticatedActionButton>
                    </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-hidden bg-muted/30">
                    {isInitializing ? (
                        <ChatLoadingState />
                    ) : (
                        <ScrollArea className="h-full px-4">
                            <div className={`mx-auto space-y-6 py-6 ${isMobile ? 'max-w-none px-2' : 'max-w-3xl'}`}>
                                {chatMessages.map((msg, i) => (
                                    <div
                                        key={i}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`${isMobile ? 'max-w-[90%]' : 'max-w-[80%]'} rounded-2xl p-4 shadow-sm ${msg.role === 'user'
                                                ? 'bg-primary text-primary-foreground ml-4'
                                                : 'bg-card mr-4'
                                                } [&_.markdown]:text-base ${isMobile ? '[&_.markdown]:text-sm' : ''} relative group`}
                                        >
                                            <MemoizedMarkdown content={msg.content} id={`msg-${i}`} />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute bottom-2 right-2 h-6 w-6"
                                                onClick={async () => {
                                                    const button = document.getElementById(`copy-btn-${i}`);
                                                    if (!button) return;

                                                    await navigator.clipboard.writeText(msg.content);

                                                    button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="h-3 w-3"><polyline points="20 6 9 17 4 12"></polyline></svg>';

                                                    setTimeout(() => {
                                                        if (button) {
                                                            button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="h-3 w-3"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>';
                                                        }
                                                    }, 2000);
                                                }}
                                                id={`copy-btn-${i}`}
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
                                        <div className="max-w-[80%] rounded-2xl p-4 shadow-sm bg-card mr-4 [&_.markdown]:text-base">
                                            <MemoizedMarkdown content={streamingContent} id="streaming" />
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>
                        </ScrollArea>
                    )}
                </div>

                {/* Chat Input */}
                <div className={`flex-shrink-0 border-t bg-background ${isMobile ? 'p-3' : 'p-6'}`}>
                    <form className={`${isMobile ? 'w-full' : 'max-w-3xl mx-auto'} flex gap-3`} onSubmit={handleSubmit}>
                        <AutosizeTextarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type your message..."
                            className="flex-1 py-3 px-4 text-base rounded-lg border-muted-foreground/20 min-h-0 overflow-y-auto resize-none"
                            style={{
                                scrollbarWidth: 'thin',
                                scrollbarColor: 'rgba(0,0,0,0.2) transparent'
                            }}
                            disabled={isGenerating || isInitializing}
                            minHeight={24}
                            maxHeight={isMobile ? 100 : 200}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                    e.preventDefault();
                                    const form = e.currentTarget.form;
                                    if (form) {
                                        const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
                                        form.dispatchEvent(submitEvent);
                                    }
                                } else if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const target = e.currentTarget;
                                    const start = target.selectionStart;
                                    const end = target.selectionEnd;
                                    const newValue = message.substring(0, start) + '\n' + message.substring(end);
                                    setMessage(newValue);
                                    requestAnimationFrame(() => {
                                        target.selectionStart = target.selectionEnd = start + 1;
                                    });
                                }
                            }}
                        />
                        <div className="flex gap-2 items-end">
                            <AuthenticatedActionButton
                                type="submit"
                                disabled={isGenerating || !message.trim() || !currentSpace || isInitializing}
                                rightLoading={isGenerating}
                                className="rounded-lg"
                            >
                                {isGenerating ? 'Thinking...' : 'Send'}
                            </AuthenticatedActionButton>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowSettingsDialog(true)}
                                className="rounded-lg h-10 w-10 text-muted-foreground hover:text-foreground"
                                title="Chat Settings"
                            >
                                <SlidersHorizontal className="h-4 w-4" />
                            </Button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Dialogs - Add mobile-specific classes */}
            <Dialog open={showDiscourseDialog} onOpenChange={setShowDiscourseDialog}>
                <DialogContent className={`${isMobile ? 'w-[95vw] rounded-lg' : 'sm:max-w-[500px]'}`}>
                    <DialogHeader>
                        <DialogTitle>Connect Discourse Account</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">
                            Connect your Discourse account to enhance the AI&apos;s understanding of your writing style and arguments.
                            This is optional but recommended for better assistance.
                        </p>

                        {/* Connection Status Banner */}
                        {connectionStatus === 'partially_connected' && (
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                                <div className="flex items-center gap-2">
                                    <CircleDotIcon className="h-4 w-4 text-yellow-500" />
                                    <p className="text-sm font-medium text-yellow-500">Partially Connected</p>
                                </div>
                                <p className="text-sm text-muted-foreground mt-2">
                                    You have stored messages but no active connection. Please enter your credentials to reconnect.
                                </p>
                            </div>
                        )}

                        {connectionStatus === 'pending' && (
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                                <div className="flex items-center gap-2">
                                    <CircleDotIcon className="h-4 w-4 text-blue-500" />
                                    <p className="text-sm font-medium text-blue-500">Connection Pending</p>
                                </div>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Credentials set but no messages fetched yet. Click connect to fetch your messages.
                                </p>
                            </div>
                        )}

                        {/* Message count indicator */}
                        {storedMessages.length > 0 && (
                            <div className="bg-muted/50 rounded-lg p-4 border">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-sm font-medium">
                                            {storedMessages.length} {storedMessages.length === 1 ? 'message' : 'messages'} stored
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Last updated: {storedMessages.length > 0
                                                ? new Date(Math.max(...storedMessages.map(m => new Date(m.created_at).getTime()))).toLocaleString()
                                                : 'N/A'}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                handleViewMessages();
                                            }}
                                            className="text-xs"
                                        >
                                            View Messages
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDeleteMessages()}
                                            className="text-xs text-destructive hover:text-destructive"
                                        >
                                            Clear
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="discourse-url">Discourse URL</Label>
                            <Input
                                id="discourse-url"
                                value={discourseUrl}
                                onChange={(e) => setDiscourseUrl(e.target.value)}
                                placeholder="https://forum.scroll.io"
                                disabled={isConnectingToDiscourse}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="discourse-username">Username</Label>
                            <Input
                                id="discourse-username"
                                value={discourseUsername}
                                onChange={(e) => setDiscourseUsername(e.target.value)}
                                placeholder="Your Discourse username"
                                disabled={isConnectingToDiscourse}
                            />
                        </div>
                        {isConnectingToDiscourse && fetchProgress > 0 && (
                            <div className="space-y-2">
                                <Progress value={fetchProgress} className="w-full h-2" />
                                <p className="text-xs text-muted-foreground text-center">
                                    {fetchProgress < 20 && "Initializing..."}
                                    {fetchProgress >= 20 && fetchProgress < 90 && "Fetching messages..."}
                                    {fetchProgress >= 90 && fetchProgress < 95 && "Processing data..."}
                                    {fetchProgress >= 95 && "Finishing up..."}
                                </p>
                            </div>
                        )}
                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowDiscourseDialog(false)}
                            disabled={isConnectingToDiscourse}
                        >
                            Cancel
                        </Button>
                        <AuthenticatedActionButton
                            onClick={() => handleConnectToDiscourse()}
                            disabled={isConnectingToDiscourse || !discourseUsername.trim()}
                            rightLoading={isConnectingToDiscourse}
                        >
                            {isConnectingToDiscourse ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Connecting...
                                </>
                            ) : (
                                'Connect'
                            )}
                        </AuthenticatedActionButton>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Consent Dialog */}
            <Dialog open={showConsentDialog} onOpenChange={setShowConsentDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Feature Improvement Consent</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground mb-4">
                            To help improve and use our features, we&apos;d like to use your public forum messages. This data will be used to:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground mb-6">
                            <li>Enhance the overall user experience</li>
                            <li>Facilitate the ChatBot feature</li>
                            <li>Enhance our AI suggestions and improvements</li>
                            <li>And more!</li>
                        </ul>
                        <p className="text-sm text-muted-foreground">
                            You can change this setting anytime in your profile settings.
                        </p>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setShowConsentDialog(false)}
                            disabled={isUpdatingConsent}
                        >
                            Cancel
                        </Button>
                        <AuthenticatedActionButton
                            onClick={handleConsentAndConnect}
                            disabled={isUpdatingConsent}
                            rightLoading={isUpdatingConsent}
                        >
                            {isUpdatingConsent ? 'Updating...' : 'Allow and Connect'}
                        </AuthenticatedActionButton>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Chat Confirmation Dialog */}
            <AlertDialog open={!!chatToDelete} onOpenChange={(open) => !open && setChatToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Chat</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this chat? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (chatToDelete) {
                                    deleteChat(chatToDelete);
                                    setChatToDelete(null);
                                }
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Add rename dialog */}
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
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="name">Chat Name</Label>
                                <Input
                                    id="name"
                                    value={newChatTitle}
                                    onChange={(e) => setNewChatTitle(e.target.value)}
                                    placeholder="Enter chat name"
                                    autoComplete="off"
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-end space-x-2">
                            <Button type="button" variant="outline" onClick={() => setChatToRename(null)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={!newChatTitle.trim()}>
                                Save
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* View Messages Dialog */}
            <Dialog open={showMessagesModal} onOpenChange={setShowMessagesModal}>
                <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle>Discourse Messages</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh] pr-4">
                        <div className="space-y-4 py-4">
                            {storedMessages.length === 0 ? (
                                <p className="text-center text-muted-foreground">No messages found</p>
                            ) : (
                                [...storedMessages]
                                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                    .map((message) => (
                                        <div key={message.id} className="border rounded-lg p-4 bg-card">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="space-y-1">
                                                    {message.topic_title && (
                                                        <p className="text-sm font-medium">Topic: {message.topic_title}</p>
                                                    )}
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(message.created_at).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="prose dark:prose-invert max-w-none text-sm mt-2">
                                                <div dangerouslySetInnerHTML={{ __html: message.content }} />
                                            </div>
                                        </div>
                                    ))
                            )}
                        </div>
                    </ScrollArea>
                    <div className="flex justify-between pt-4 items-center">
                        <p className="text-xs text-muted-foreground">
                            {storedMessages.length} messages sorted by newest first
                        </p>
                        <Button onClick={() => setShowMessagesModal(false)}>
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Settings Dialog */}
            <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Chat Settings</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Include Discourse Messages</Label>
                                <p className="text-sm text-muted-foreground">
                                    Send your forum messages to the AI for context
                                </p>
                            </div>
                            <Switch
                                checked={settings.includeDiscourseMessages}
                                onCheckedChange={(checked) =>
                                    setSettings(prev => ({ ...prev, includeDiscourseMessages: checked }))
                                }
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Include Points</Label>
                                <p className="text-sm text-muted-foreground">
                                    Send your points to the AI for context
                                </p>
                            </div>
                            <Switch
                                checked={settings.includePoints}
                                onCheckedChange={(checked) =>
                                    setSettings(prev => ({ ...prev, includePoints: checked }))
                                }
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Include Endorsements</Label>
                                <p className="text-sm text-muted-foreground">
                                    Send your endorsed points to the AI for context
                                </p>
                            </div>
                            <Switch
                                checked={settings.includeEndorsements}
                                onCheckedChange={(checked) =>
                                    setSettings(prev => ({ ...prev, includeEndorsements: checked }))
                                }
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Include Rationales</Label>
                                <p className="text-sm text-muted-foreground">
                                    Send your rationales to the AI for context
                                </p>
                            </div>
                            <Switch
                                checked={settings.includeRationales}
                                onCheckedChange={(checked) =>
                                    setSettings(prev => ({ ...prev, includeRationales: checked }))
                                }
                            />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
} 