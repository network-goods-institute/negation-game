"use client";

import { useEffect, useRef, useCallback } from "react";
import { useConversation } from "@/queries/messages/useConversation";
import { useUser } from "@/queries/users/useUser";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { LoaderCircleIcon } from "lucide-react";
import { useMarkMessagesAsRead } from "@/mutations/messages/useMarkMessagesAsRead";
import { useConversationSSE } from "@/hooks/messages/useConversationSSE";
import { useClosedConversations } from "@/hooks/messages/useClosedConversations";
import { generateConversationId } from "@/db/schema";import { logger } from "@/lib/logger";

interface ConversationViewProps {
    username: string;
    spaceId: string;
}

export const ConversationView = ({ username: otherUsername, spaceId }: ConversationViewProps) => {
    const { data: user } = useUser();
    const { data: otherUser, isLoading: isLoadingOtherUser } = useUser(otherUsername);
    const { data: messages, isLoading: isLoadingMessages, error } = useConversation({
        otherUserId: otherUser?.id || "",
        spaceId
    });
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const markAsReadMutation = useMarkMessagesAsRead();
    const { reopenConversation } = useClosedConversations();

    const { status: sseStatus, hasNewMessages, markAsViewed, restartConnection, isConnected, reconnectAttempts } = useConversationSSE({
        otherUserId: otherUser?.id || "",
        spaceId,
        enabled: !!otherUser?.id,
        lastSequence: messages && messages.length > 0 ? messages[messages.length - 1]?.sequenceNumber?.toString() : undefined,
    });

    useEffect(() => {
        if (user?.id && otherUser?.id) {
            const conversationId = generateConversationId(user.id, otherUser.id, spaceId);
            reopenConversation(conversationId);
        }
    }, [user?.id, otherUser?.id, spaceId, reopenConversation]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const markAsRead = useCallback(() => {
        if (messages && messages.length > 0 && otherUser?.id) {
            markAsReadMutation.mutate({ otherUserId: otherUser.id, spaceId });
            markAsViewed();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages, otherUser?.id, spaceId, markAsViewed]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        markAsRead();
    }, [markAsRead]);

    useEffect(() => {
        if (reconnectAttempts >= 3) {
            logger.warn("Conversation connection has encountered multiple errors. You may need to refresh the page.");
        }
    }, [reconnectAttempts]);

    if (!user) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-muted-foreground">Please log in to view messages.</p>
            </div>
        );
    }

    if (isLoadingOtherUser || isLoadingMessages) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="flex flex-col items-center gap-3">
                    <LoaderCircleIcon className="animate-spin size-8 text-primary" />
                    <p className="text-muted-foreground">Loading conversation...</p>
                </div>
            </div>
        );
    }

    if (!otherUser) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <p className="text-red-500 font-medium mb-2">User not found</p>
                    <p className="text-muted-foreground text-sm">The user &quot;{otherUsername}&quot; doesn&apos;t exist</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <p className="text-red-500 font-medium mb-2">Failed to load conversation</p>
                    <p className="text-muted-foreground text-sm">Please try refreshing the page</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Connection status */}
            {!isConnected && reconnectAttempts > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/30 border-b border-yellow-200 dark:border-yellow-800/50 px-6 py-3">
                    <div className="max-w-4xl mx-auto">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                            Connection lost. Messages may not update in real-time.
                            <button
                                onClick={restartConnection}
                                className="ml-2 underline hover:no-underline font-semibold text-yellow-900 dark:text-yellow-100"
                            >
                                Reconnect
                            </button>
                        </p>
                    </div>
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-hidden bg-background">
                <div className="h-full max-w-4xl mx-auto px-6 flex flex-col">
                    <div className="flex-1 overflow-y-auto py-6 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                        <MessageList messages={messages || []} currentUserId={user.id} spaceId={spaceId} />
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Message Input Area */}
                    <div className="bg-card border-t border-border px-4 py-4">
                        <MessageInput
                            recipientId={otherUser.id}
                            spaceId={spaceId}
                            onMessageSent={scrollToBottom}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}; 