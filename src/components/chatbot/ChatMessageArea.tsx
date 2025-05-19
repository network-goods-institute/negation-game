"use client";

import React, { useState } from "react";
import { Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemoizedMarkdown } from "@/components/MemoizedMarkdown";
import { AuthenticatedActionButton } from "@/components/AuthenticatedActionButton";
import { Skeleton } from "@/components/ui/skeleton";
import { DetailedSourceList } from "./DetailedSourceList";
import { ChatRationale } from "@/types/chat";
import { InitialOptionObject } from "./AIAssistant";
import { useChatState } from "@/hooks/useChatState";
import { useChatListManagement } from "@/hooks/useChatListManagement";
import { useDiscourseIntegration } from "@/hooks/useDiscourseIntegration";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const ChatLoadingState = () => {
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

export interface ChatMessageAreaProps {
    isInitializing: boolean;
    isFetchingRationales: boolean;
    chatState: ReturnType<typeof useChatState>;
    isGeneratingCurrent: boolean;
    isFetchingCurrentContext: boolean;
    currentStreamingContent: string;
    chatList: ReturnType<typeof useChatListManagement>;
    discourse: ReturnType<typeof useDiscourseIntegration>;
    isAuthenticated: boolean;
    userRationales: ChatRationale[];
    availableRationales: ChatRationale[];
    currentSpace: string | null;
    isMobile: boolean;
    initialOptions: InitialOptionObject[];
    onStartChatOption: (option: InitialOptionObject) => void;
    onTriggerEdit: (index: number, content: string) => void;
}

export function ChatMessageArea({
    isInitializing,
    isFetchingRationales,
    chatState,
    isGeneratingCurrent,
    isFetchingCurrentContext,
    currentStreamingContent,
    chatList,
    discourse,
    isAuthenticated,
    availableRationales,
    currentSpace,
    isMobile,
    initialOptions,
    onStartChatOption,
    onTriggerEdit,
}: ChatMessageAreaProps) {
    const [copyingMessageId, setCopyingMessageId] = useState<string | null>(null);
    const [copySuccessMessageId, setCopySuccessMessageId] = useState<string | null>(null);
    const debouncedStreamingContent = useDebounce(currentStreamingContent, 150);

    const handleCopy = async (index: number) => {
        const messageId = `${chatList.currentChatId || 'nochat'}-${index}`;
        setCopyingMessageId(messageId);
        try {
            await chatState.handleCopy(index);
            setCopyingMessageId(null);
            setCopySuccessMessageId(messageId);
            setTimeout(() => setCopySuccessMessageId(null), 1000);
        } catch (error) {
            setCopyingMessageId(null);
        }
    };

    const handleRawCopy = async (index: number) => {
        const messageId = `${chatList.currentChatId || 'nochat'}-${index}`;
        setCopyingMessageId(messageId);
        try {
            const raw = chatState.chatMessages[index].content;
            const textarea = document.createElement('textarea');
            textarea.value = raw;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopyingMessageId(null);
            setCopySuccessMessageId(messageId);
            setTimeout(() => setCopySuccessMessageId(null), 1000);
            toast.success('Raw text copied to clipboard!');
        } catch (err) {
            console.error('Raw copy failed:', err);
            setCopyingMessageId(null);
            toast.error('Failed to copy raw text.');
        }
    };

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
                        <div className="grid gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {initialOptions.map((option) => {
                                const isDisabled = option.id === 'distill'
                                    ? isFetchingRationales || !isAuthenticated || (!isFetchingRationales && availableRationales.length === 0)
                                    : option.disabled || !isAuthenticated;
                                const description = option.id === 'distill'
                                    ? "Organize your existing rationales into an essay."
                                    : option.description;

                                const earlyAccessBadge = option.isEarlyAccess ? (
                                    <TooltipProvider>
                                        <Tooltip delayDuration={300}>
                                            <TooltipTrigger className="mt-2">
                                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                                                    Early Access
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" align="center">
                                                <p className="text-xs max-w-xs">
                                                    This feature is in early access. It may be unstable and is not reflective of the final user experience.
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                ) : null;

                                return (
                                    <div key={option.id} className="flex flex-col items-center">
                                        <AuthenticatedActionButton
                                            variant="outline"
                                            className={`w-full h-auto min-h-[6rem] p-2 md:min-h-[8rem] md:p-4 flex flex-col items-center justify-center gap-1.5 text-center rounded-lg hover:bg-accent focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 ${isDisabled || option.comingSoon ? 'opacity-50 cursor-not-allowed' : ''
                                                }`}
                                            onClick={() => onStartChatOption(option)}
                                            disabled={isDisabled || option.comingSoon || isGeneratingCurrent}
                                            aria-disabled={isDisabled || option.comingSoon}
                                        >
                                            {option.id === 'distill' && isInitializing ? (
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                                    <span className="text-xs text-muted-foreground">Loading Rationales...</span>
                                                </div>
                                            ) : option.id === 'distill' && isFetchingRationales ? (
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                                    <span className="text-xs text-muted-foreground">Loading Rationales...</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="text-sm md:text-lg font-semibold break-words whitespace-normal">
                                                        {option.title}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground text-balance">
                                                        {description}
                                                    </p>
                                                    {option.comingSoon && (
                                                        <span className="text-xs text-primary font-medium mt-1">Coming Soon</span>
                                                    )}
                                                </>
                                            )}
                                        </AuthenticatedActionButton>
                                        {earlyAccessBadge}
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-center text-xs text-muted-foreground">Or, just type your message below to start a general chat.</p>
                    </div>
                </div>
            ) : (
                <div id="chat-scroll-area">
                    <div className={`space-y-4 md:space-y-6 py-4 md:py-6 px-2 md:px-4`}>
                        {chatState.chatMessages.map((msg, i) => {
                            const messageId = `${chatList.currentChatId || 'nochat'}-${i}`;
                            return (
                                <div key={messageId} className={`group flex w-full flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
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

                                    {msg.role === 'user' && (
                                        <div className="mt-1 flex gap-1.5 justify-end">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                title="Copy (Ctrl+Click for raw)"
                                                onClick={(e) => {
                                                    if (e.ctrlKey || e.metaKey) {
                                                        handleRawCopy(i);
                                                    } else {
                                                        handleCopy(i);
                                                    }
                                                }}
                                                disabled={isGeneratingCurrent || copyingMessageId === messageId}
                                            >
                                                {copyingMessageId === messageId ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : copySuccessMessageId === messageId ? (
                                                    <Check className="h-4 w-4 text-green-500" />
                                                ) : (
                                                    <Copy className="h-4 w-4" />
                                                )}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                title="Edit"
                                                onClick={() => onTriggerEdit(i, msg.content)}
                                                disabled={isGeneratingCurrent}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                                    <path d="M12 20h9" />
                                                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                                </svg>
                                            </Button>
                                        </div>
                                    )}

                                    {msg.role === 'assistant' && (
                                        <div className="mt-1 flex gap-1.5" style={{ marginLeft: isMobile ? 'calc(100% - 80px)' : 'calc(100% - 380px)' }}>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                title="Copy (Ctrl+Click for raw)"
                                                onClick={(e) => {
                                                    if (e.ctrlKey || e.metaKey) {
                                                        handleRawCopy(i);
                                                    } else {
                                                        handleCopy(i);
                                                    }
                                                }}
                                                disabled={isGeneratingCurrent || copyingMessageId === messageId}
                                            >
                                                {copyingMessageId === messageId ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : copySuccessMessageId === messageId ? (
                                                    <Check className="h-4 w-4 text-green-500" />
                                                ) : (
                                                    <Copy className="h-4 w-4" />
                                                )}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                title="Retry"
                                                onClick={() => chatState.handleRetry(i)}
                                                disabled={isGeneratingCurrent || i === 0}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                                    <path d="M3 3v5h5" />
                                                </svg>
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {isGeneratingCurrent && isFetchingCurrentContext && (
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