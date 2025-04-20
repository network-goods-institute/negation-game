"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemoizedMarkdown } from "@/components/MemoizedMarkdown";
import { AuthenticatedActionButton } from "@/components/AuthenticatedActionButton";
import { Skeleton } from "@/components/ui/skeleton";
import { DetailedSourceList } from "./DetailedSourceList";
import { InitialOption, ChatRationale } from "@/types/chat";
import { useChatState } from "@/hooks/useChatState";
import { useChatListManagement } from "@/hooks/useChatListManagement";
import { useDiscourseIntegration } from "@/hooks/useDiscourseIntegration";
import { useDebounce } from "@/hooks/useDebounce";

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

interface ChatMessageAreaProps {
    isInitializing: boolean;
    chatState: ReturnType<typeof useChatState>;
    chatList: ReturnType<typeof useChatListManagement>;
    discourse: ReturnType<typeof useDiscourseIntegration>;
    isAuthenticated: boolean;
    userRationales: ChatRationale[];
    currentSpace: string | null;
    isMobile: boolean;
    onStartChatOption: (option: InitialOption) => void;
    onTriggerEdit: (index: number, content: string) => void;
}

export function ChatMessageArea({
    isInitializing,
    chatState,
    chatList,
    discourse,
    isAuthenticated,
    userRationales,
    currentSpace,
    isMobile,
    onStartChatOption,
    onTriggerEdit,
}: ChatMessageAreaProps) {
    const debouncedStreamingContent = useDebounce(chatState.streamingContent, 150);

    return (
        <div className="flex-1 overflow-y-auto bg-muted/20 min-h-0 pt-16 pb-24 md:pb-28">
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
                                onClick={() => onStartChatOption('distill')}
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
                <div id="chat-scroll-area">
                    <div className={`space-y-4 md:space-y-6 py-4 md:py-6 px-2 md:px-4`}>
                        {chatState.chatMessages.map((msg, i) => (
                            <div key={`${chatList.currentChatId || 'nochat'}-${i}`} className={`group flex w-full flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div
                                    className={`relative ${isMobile ? 'max-w-[90%]' : 'max-w-[80%]'} rounded-xl md:rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card text-card-foreground'} p-3 md:p-4`}
                                >
                                    <MemoizedMarkdown
                                        content={msg.content} id={`msg-${i}`}
                                        isUserMessage={msg.role === 'user'}
                                        space={currentSpace}
                                        discourseUrl={discourse.discourseUrl}
                                        storedMessages={discourse.storedMessages}
                                    />

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

                                <div className={`mt-1 flex w-full gap-1.5 ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Copy" onClick={() => chatState.handleCopy(i)} disabled={chatState.isGenerating}>
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                                    </Button>

                                    {/* Only show Edit button for user messages */}
                                    {msg.role === 'user' && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                            title="Edit"
                                            onClick={() => onTriggerEdit(i, msg.content)}
                                            disabled={chatState.isGenerating /* || editingMessageIndex !== null -> state managed by parent */}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                                        </Button>
                                    )}

                                    {msg.role === 'assistant' && (
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Retry" onClick={() => chatState.handleRetry(i)} disabled={chatState.isGenerating /* || editingMessageIndex !== null -> state managed by parent */ || i === 0}>
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                                        </Button>
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
                        {debouncedStreamingContent && (
                            <div className="flex justify-start">
                                <div className={`${isMobile ? 'max-w-[90%]' : 'max-w-[80%]'} rounded-xl md:rounded-2xl p-3 md:p-4 shadow-sm bg-card text-card-foreground mr-4 [&_.markdown]:text-sm [&_.markdown]:md:text-base`}>
                                    <MemoizedMarkdown
                                        content={debouncedStreamingContent + " ▋"}
                                        id="streaming"
                                        space={currentSpace}
                                        discourseUrl={discourse.discourseUrl}
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
    );
} 