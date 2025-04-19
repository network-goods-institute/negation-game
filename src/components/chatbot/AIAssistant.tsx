"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ArrowLeft, CircleIcon, CircleDotIcon, Menu, SlidersHorizontal, } from "lucide-react";
import { useUser } from "@/queries/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
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
import { ChatRationale, ChatSettings, InitialOption } from '@/types/chat';
import { useDiscourseIntegration } from "@/hooks/useDiscourseIntegration";
import { useChatListManagement } from "@/hooks/useChatListManagement";
import { useChatState } from "@/hooks/useChatState";
import { ChatSidebar } from './ChatSidebar';

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

export default function AIAssistant() {
    const router = useRouter();
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

    const isNonGlobalSpace = currentSpace !== null && currentSpace !== 'global';

    const chatList = useChatListManagement({ currentSpace, isAuthenticated });
    const discourse = useDiscourseIntegration({ userData, isAuthenticated, isNonGlobalSpace, currentSpace, privyUserId: privyUser?.id });
    const chatState = useChatState({ currentChatId: chatList.currentChatId, currentSpace, isAuthenticated, settings, endorsedPoints, userRationales, storedMessages: discourse.storedMessages, savedChats: chatList.savedChats, updateChat: chatList.updateChat, createNewChat: chatList.createNewChat });

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

    const handleCreateNewChat = () => {
        const newId = chatList.createNewChat();
        if (newId) {
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
                                        disabled={chatState.isGenerating || userRationales.length === 0 || !isAuthenticated}
                                    >
                                        <div className="text-sm md:text-lg font-semibold">Distill Rationales</div><p className="text-xs text-muted-foreground text-balance">{userRationales.length === 0 ? "You don't have any rationales yet." : "Organize your existing rationales into an essay."}</p>
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