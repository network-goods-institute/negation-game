"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ArrowLeft, Trash2, MessageSquare, Settings2, CircleIcon, CircleDotIcon } from "lucide-react";
import { useUser } from "@/queries/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { updateUserProfile } from "@/actions/updateUserProfile";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { userQueryKey } from "@/queries/useUser";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { generateChatResponse, EndorsedPoint } from "@/actions/generateChatResponse";
import { nanoid } from "nanoid";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import * as ContextMenu from "@radix-ui/react-context-menu";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AuthenticatedActionButton } from "@/components/ui/AuthenticatedActionButton";
import { fetchUserEndorsedPoints } from "@/actions/fetchUserEndorsedPoints";
import { getSpace } from "@/actions/getSpace";

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

export default function AIAssistant() {
    const router = useRouter();
    const { user: privyUser } = usePrivy();
    const { data: userData } = useUser(privyUser?.id);
    const queryClient = useQueryClient();

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

    // Chat-related state
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
    const [showSidebar, setShowSidebar] = useState(true);
    const [message, setMessage] = useState('');
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{
        role: 'assistant',
        content: `Hello! I'm here to help you write your essay. What topic would you like to write about?`
    }]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);
    const [chatToDelete, setChatToDelete] = useState<string | null>(null);
    const [chatToRename, setChatToRename] = useState<string | null>(null);
    const [newChatTitle, setNewChatTitle] = useState('');

    const [currentSpace, setCurrentSpace] = useState<string | null>(null);

    useEffect(() => {
        const fetchCurrentSpace = async () => {
            try {
                const space = await getSpace();
                setCurrentSpace(space);
            } catch (error) {
                console.error('Error fetching current space:', error);
                setCurrentSpace('global');
            }
        };

        fetchCurrentSpace();
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
                content: `Hello! I'm here to help you write your essay. What topic would you like to write about?`
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

    useEffect(() => {
        if (!currentSpace) return;

        const savedChatsStr = localStorage.getItem(`saved_chats_${currentSpace}`);
        if (savedChatsStr) {
            try {
                const chats = JSON.parse(savedChatsStr);
                setSavedChats(chats);


                if (!currentChatId && chats.length > 0) {

                    setCurrentChatId(chats[0].id);
                    setChatMessages(chats[0].messages);
                }
            } catch (error) {
                console.error('Error loading saved chats:', error);
            }
        } else {
            // Only create a new chat if we don't have any
            setSavedChats([]);
            createNewChat();
        }
    }, [currentSpace, createNewChat]);

    useEffect(() => {
        if (savedChats.length > 0 && currentSpace) {
            localStorage.setItem(`saved_chats_${currentSpace}`, JSON.stringify(savedChats));
        }
    }, [savedChats, currentSpace]);

    useEffect(() => {
        const fetchEndorsedPoints = async () => {
            if (privyUser?.id) {
                try {
                    const userPoints = await fetchUserEndorsedPoints();
                    if (userPoints && userPoints.length > 0) {
                        const simplifiedPoints: EndorsedPoint[] = userPoints.map(point => ({
                            pointId: point.pointId,
                            content: point.content,
                            cred: point.endorsedCred
                        }));
                        setEndorsedPoints(simplifiedPoints);
                    }
                } catch (error) {
                    console.error('Failed to fetch endorsed points:', error);
                }
            }
        };

        fetchEndorsedPoints();
    }, [privyUser?.id]);

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

    // Wrap saveMessagesToStorage in useCallback
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

    const deleteChat = (chatId: string) => {
        if (!currentSpace) return;

        const updatedChats = savedChats.filter(chat => chat.id !== chatId);
        setSavedChats(updatedChats);
        localStorage.setItem(`saved_chats_${currentSpace}`, JSON.stringify(updatedChats));

        if (chatId === currentChatId) {
            if (updatedChats.length > 0) {
                setCurrentChatId(updatedChats[0].id);
                setChatMessages(updatedChats[0].messages);
            } else {
                setCurrentChatId(null);
                setChatMessages([{
                    role: 'assistant',
                    content: `Hello! I'm here to help you write your essay. What topic would you like to write about?`
                }]);
            }
        }
    };

    const switchChat = (chatId: string) => {
        const chat = savedChats.find(c => c.id === chatId);
        if (chat) {
            setCurrentChatId(chatId);
            setChatMessages(chat.messages);
        }
    };

    const handleChatSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!message.trim() || isGenerating || !currentSpace) {

            return;
        }


        const userMessageText = message.trim();
        setMessage('');

        let chatId: string;
        let initialMessages: ChatMessage[];

        // ======= PHASE 1: ENSURE WE HAVE A VALID CHAT =======
        if (!currentChatId) {
            chatId = nanoid();

            initialMessages = [{
                role: 'assistant',
                content: `Hello! I'm here to help you write your essay. What topic would you like to write about?`
            }];

            const newChat: SavedChat = {
                id: chatId,
                title: 'New Chat',
                messages: initialMessages,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                space: currentSpace
            };

            // Create and save the new chat first, before proceeding
            await new Promise<void>(resolve => {
                setSavedChats(prev => {
                    const updated = [newChat, ...prev];
                    if (currentSpace) {
                        localStorage.setItem(`saved_chats_${currentSpace}`, JSON.stringify(updated));
                    }
                    resolve();
                    return updated;
                });
            });

            setCurrentChatId(chatId);
            setChatMessages(initialMessages);
        } else {
            chatId = currentChatId;


            const existingChat = savedChats.find(c => c.id === chatId);
            if (!existingChat) {
                return createNewChat();
            }

            initialMessages = [...chatMessages];
        }

        // ======= PHASE 2: ADD USER MESSAGE AND GENERATE RESPONSE =======
        const userMessage: ChatMessage = { role: 'user', content: userMessageText };
        const messagesWithUserInput = [...initialMessages, userMessage];

        setChatMessages(messagesWithUserInput);

        const discourseContext = storedMessages.map(msg => ({
            role: 'system' as const,
            content: `[Forum Post from ${new Date(msg.created_at).toLocaleString()}${msg.topic_title ? ` in "${msg.topic_title}"` : ''}]\n${msg.raw || msg.content}`
        }));

        setIsGenerating(true);
        setStreamingContent('');

        try {
            const stream = await generateChatResponse([...discourseContext, ...messagesWithUserInput], endorsedPoints);
            if (!stream) {
                throw new Error('Failed to get response stream');
            }

            const reader = stream.getReader();
            let accumulatedContent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                accumulatedContent += value;
                setStreamingContent(accumulatedContent);
            }


            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: accumulatedContent
            };

            // Combine all messages
            const finalMessages = [...messagesWithUserInput, assistantMessage];

            setChatMessages(finalMessages);

            let updatedChat: SavedChat | undefined = undefined;

            await new Promise<void>(resolve => {
                setSavedChats(prev => {
                    const targetChatIndex = prev.findIndex(c => c.id === chatId);

                    if (targetChatIndex === -1) {
                        console.error('[handleChatSubmit] Chat disappeared during processing:', chatId);
                        resolve();
                        return prev;
                    }

                    const updated = [...prev];
                    updatedChat = {
                        ...updated[targetChatIndex],
                        messages: finalMessages,
                        updatedAt: new Date().toISOString()
                    };
                    updated[targetChatIndex] = updatedChat;

                    if (currentSpace) {
                        localStorage.setItem(`saved_chats_${currentSpace}`, JSON.stringify(updated));
                    }
                    console.log('[handleChatSubmit] Updated chat with new messages:', chatId);
                    resolve();
                    return updated;
                });
            });

            setStreamingContent('');
        } catch (error) {
            console.error('[handleChatSubmit] Error generating response:', error);
            toast.error('Failed to generate response. Please try again.');
            setChatMessages([...messagesWithUserInput]);
        } finally {
            setIsGenerating(false);
        }
    };

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

    useEffect(() => {
        const shouldConnect = userData?.discourseUsername &&
            userData?.discourseCommunityUrl &&
            !hasStoredMessages &&
            !isConnectingToDiscourse;

        if (shouldConnect) {
            const messages = loadStoredMessages();
            if (messages.length === 0) {
                handleConnectToDiscourse();
            } else {
                setStoredMessages(messages);
                setHasStoredMessages(true);
            }
        }
    }, [userData, handleConnectToDiscourse, hasStoredMessages, isConnectingToDiscourse]);

    useEffect(() => {
        if (userData) {
            if (!userData.discourseUsername) {
                setShowDiscourseDialog(true);
            } else {
                setDiscourseUsername(userData.discourseUsername);
                setDiscourseUrl(userData.discourseCommunityUrl || 'https://forum.scroll.io');
            }
        }
    }, [userData]);

    const handleConsentAndConnect = async () => {
        try {
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
        }
    };

    const handleViewMessages = () => {
        try {
            console.log("Loading stored messages from localStorage");
            const messages = loadStoredMessages();
            console.log(`Found ${messages.length} messages in localStorage:`, messages);

            // Explicitly update the state with the loaded messages
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

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        handleConnectToDiscourse();
    };

    const handleDeleteMessages = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('discourse_messages');
            setStoredMessages([]);
            setHasStoredMessages(false);
            toast.success('Messages deleted successfully');
            router.push('/');
        }
    };

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages, streamingContent]);

    useEffect(() => {
        if (currentChatId && chatMessages.length > 0) {
            setSavedChats(prev => {
                const updatedChats = prev.map(chat =>
                    chat.id === currentChatId
                        ? {
                            ...chat,
                            messages: chatMessages,
                            updatedAt: new Date().toISOString()
                        }
                        : chat
                );
                if (currentSpace) {
                    localStorage.setItem(`saved_chats_${currentSpace}`, JSON.stringify(updatedChats));
                }
                return updatedChats;
            });
        }
    }, [currentChatId, chatMessages, currentSpace]);

    const renameChat = (chatId: string, newTitle: string) => {
        if (!newTitle.trim()) return;

        setSavedChats(prev => {
            const chatIndex = prev.findIndex(c => c.id === chatId);
            if (chatIndex === -1) return prev;

            const updated = [...prev];
            updated[chatIndex] = {
                ...updated[chatIndex],
                title: newTitle.trim()
            };

            if (currentSpace) {
                localStorage.setItem(`saved_chats_${currentSpace}`, JSON.stringify(updated));
            }
            return updated;
        });

        setChatToRename(null);
        setNewChatTitle('');
    };

    return (
        <div className="flex h-[calc(100vh-var(--header-height))]">
            {/* Sidebar */}
            <div className={`w-64 border-r bg-background flex-shrink-0 ${showSidebar ? '' : 'hidden'}`}>
                <div className="h-14 border-b flex items-center justify-between px-4">
                    <h2 className="font-semibold">Chats</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            createNewChat();
                        }}
                        title="New Chat"
                    >
                        <MessageSquare className="h-5 w-5" />
                    </Button>
                </div>
                <ScrollArea className="h-[calc(100vh-var(--header-height)-3.5rem)]">
                    <div className="p-2 space-y-2">
                        {savedChats.map((chat) => (
                            <ContextMenu.Root key={chat.id}>
                                <ContextMenu.Trigger>
                                    <div
                                        className={`group p-2 rounded-lg cursor-pointer hover:bg-accent flex justify-between items-center ${chat.id === currentChatId ? 'bg-accent' : ''
                                            }`}
                                        onClick={() => switchChat(chat.id)}
                                    >
                                        <span className="truncate flex-1">
                                            {chat.title}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
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
                </ScrollArea>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="sticky top-0 z-10 h-14 border-b flex items-center justify-between px-4 bg-background">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push('/')}
                            className="text-primary"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <h2 className="font-semibold">AI Assistant</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 mr-2">
                            {hasStoredMessages ? (
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <CircleDotIcon className="h-4 w-4 text-green-500" />
                                    <span>Connected to Discourse</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <CircleIcon className="h-4 w-4" />
                                    <span>Not Connected</span>
                                </div>
                            )}
                        </div>
                        <AuthenticatedActionButton
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowDiscourseDialog(true)}
                            className="text-primary"
                            title="Connect Discourse"
                        >
                            <Settings2 className="h-5 w-5" />
                        </AuthenticatedActionButton>
                    </div>
                </div>

                {/* Chat Messages - Scrollable area that doesn't affect input visibility */}
                <div className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full px-4">
                        <div className="max-w-2xl mx-auto space-y-4 py-4">
                            {chatMessages.map((msg, i) => (
                                <div
                                    key={i}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-lg p-3 ${msg.role === 'user'
                                            ? 'bg-primary text-primary-foreground ml-4'
                                            : 'bg-muted mr-4'
                                            }`}
                                    >
                                        <div className="prose dark:prose-invert max-w-none text-sm [&>p]:mb-4 [&>p]:leading-7 [&>h1]:mt-8 [&>h1]:mb-4 [&>h2]:mt-6 [&>h2]:mb-4 [&>h3]:mt-4 [&>h3]:mb-2 [&>ul]:mb-4 [&>ul]:ml-6 [&>ol]:mb-4 [&>ol]:ml-6 [&>li]:mb-2 [&>blockquote]:border-l-4 [&>blockquote]:border-muted [&>blockquote]:pl-4 [&>blockquote]:italic">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    p: ({ children }) => <p className="whitespace-pre-wrap break-words m-0">{children}</p>,
                                                    a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{children}</a>,
                                                    ul: ({ children }) => <ul className="my-2 list-disc list-inside">{children}</ul>,
                                                    ol: ({ children }) => <ol className="my-2 list-decimal list-inside">{children}</ol>,
                                                    li: ({ children }) => <li className="my-0.5">{children}</li>,
                                                    code: ({ children }) => <code className="bg-muted rounded px-1 py-0.5">{children}</code>,
                                                    pre: ({ children }) => <pre className="bg-muted p-2 rounded-md overflow-x-auto my-2">{children}</pre>,
                                                    blockquote: ({ children }) => <blockquote className="border-l-4 border-muted pl-4 italic my-4">{children}</blockquote>,
                                                    h1: ({ children }) => <h1 className="text-2xl font-bold mt-8 mb-4">{children}</h1>,
                                                    h2: ({ children }) => <h2 className="text-xl font-bold mt-6 mb-4">{children}</h2>,
                                                    h3: ({ children }) => <h3 className="text-lg font-bold mt-4 mb-2">{children}</h3>,
                                                }}
                                            >
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {streamingContent && (
                                <div className="flex justify-start">
                                    <div className="max-w-[80%] rounded-lg p-3 bg-muted mr-4">
                                        <div className="prose dark:prose-invert max-w-none text-sm [&>p]:mb-4 [&>p]:leading-7 [&>h1]:mt-8 [&>h1]:mb-4 [&>h2]:mt-6 [&>h2]:mb-4 [&>h3]:mt-4 [&>h3]:mb-2 [&>ul]:mb-4 [&>ul]:ml-6 [&>ol]:mb-4 [&>ol]:ml-6 [&>li]:mb-2 [&>blockquote]:border-l-4 [&>blockquote]:border-muted [&>blockquote]:pl-4 [&>blockquote]:italic">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    p: ({ children }) => <p className="whitespace-pre-wrap break-words m-0">{children}</p>,
                                                    a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{children}</a>,
                                                    ul: ({ children }) => <ul className="my-2 list-disc list-inside">{children}</ul>,
                                                    ol: ({ children }) => <ol className="my-2 list-decimal list-inside">{children}</ol>,
                                                    li: ({ children }) => <li className="my-0.5">{children}</li>,
                                                    code: ({ children }) => <code className="bg-muted rounded px-1 py-0.5">{children}</code>,
                                                    pre: ({ children }) => <pre className="bg-muted p-2 rounded-md overflow-x-auto my-2">{children}</pre>,
                                                    blockquote: ({ children }) => <blockquote className="border-l-4 border-muted pl-4 italic my-4">{children}</blockquote>,
                                                    h1: ({ children }) => <h1 className="text-2xl font-bold mt-8 mb-4">{children}</h1>,
                                                    h2: ({ children }) => <h2 className="text-xl font-bold mt-6 mb-4">{children}</h2>,
                                                    h3: ({ children }) => <h3 className="text-lg font-bold mt-4 mb-2">{children}</h3>,
                                                }}
                                            >
                                                {streamingContent}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>
                    </ScrollArea>
                </div>

                {/* Chat Input - Always visible at bottom */}
                <div className="flex-shrink-0 border-t bg-background p-4">
                    <form className="max-w-2xl mx-auto flex gap-2" onSubmit={handleChatSubmit}>
                        <Input
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type your message..."
                            className="flex-1"
                            disabled={isGenerating}
                        />
                        <AuthenticatedActionButton
                            type="submit"
                            disabled={isGenerating || !message.trim() || !currentSpace}
                            rightLoading={isGenerating}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Thinking...
                                </>
                            ) : (
                                'Send'
                            )}
                        </AuthenticatedActionButton>
                    </form>
                </div>
            </div>

            {/* Discourse Connection Dialog */}
            <Dialog open={showDiscourseDialog} onOpenChange={setShowDiscourseDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Connect Discourse Account</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">
                            Connect your Discourse account to enhance the AI&apos;s understanding of your writing style and arguments.
                            This is optional but recommended for better assistance.
                        </p>
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
                        <Button variant="outline" onClick={() => setShowConsentDialog(false)}>
                            Cancel
                        </Button>
                        <AuthenticatedActionButton onClick={handleConsentAndConnect}>
                            Allow and Connect
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
        </div>
    );
} 