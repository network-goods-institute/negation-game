"use client";

import { useEffect, useRef, useCallback } from "react";
import { useConversation } from "@/queries/messages/useConversation";
import { useUser } from "@/queries/users/useUser";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ConversationHeader } from "./ConversationHeader";
import { LoaderCircleIcon } from "lucide-react";
import { useMarkMessagesAsRead } from "@/mutations/messages/useMarkMessagesAsRead";
import { useConversationPolling } from "@/hooks/messages/useConversationPolling";
import { useClosedConversations } from "@/hooks/messages/useClosedConversations";
import { generateConversationId } from "@/db/schema";

interface ConversationViewProps {
    otherUsername: string;
}

export const ConversationView = ({ otherUsername }: ConversationViewProps) => {
    const { data: user } = useUser();
    const { data: otherUser, isLoading: isLoadingOtherUser } = useUser(otherUsername);
    const { data: messages, isLoading: isLoadingMessages, error } = useConversation(otherUser?.id || "");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const markAsReadMutation = useMarkMessagesAsRead();
    const { reopenConversation } = useClosedConversations();

    const { status: pollStatus, hasNewMessages, markAsViewed, restartPolling, isPollingActive, errorCount } = useConversationPolling({
        otherUserId: otherUser?.id || "",
        enabled: !!otherUser?.id,
    });

    useEffect(() => {
        if (user?.id && otherUser?.id) {
            const conversationId = generateConversationId(user.id, otherUser.id);
            reopenConversation(conversationId);
        }
    }, [user?.id, otherUser?.id, reopenConversation]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const markAsRead = useCallback(() => {
        if (messages && messages.length > 0 && otherUser?.id) {
            markAsReadMutation.mutate({ otherUserId: otherUser.id });
            markAsViewed(); // Reset polling flag
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages, otherUser?.id, markAsViewed]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        markAsRead();
    }, [markAsRead]);

    useEffect(() => {
        if (errorCount >= 3) {
            console.warn("Conversation polling has encountered multiple errors. You may need to refresh the page.");
        }
    }, [errorCount]);

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
        <div className="h-screen max-w-6xl mx-auto w-full flex flex-col overflow-hidden">
            <ConversationHeader
                otherUserId={otherUser.id}
                otherUsername={otherUser.username}
            />

            {/* Show polling status if needed */}
            {!isPollingActive && errorCount > 0 && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                    <div className="flex">
                        <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                                Message polling stopped due to connection issues.
                                <button
                                    onClick={restartPolling}
                                    className="ml-2 underline hover:no-underline"
                                >
                                    Retry
                                </button>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto">
                <MessageList messages={messages || []} currentUserId={user.id} />
                <div ref={messagesEndRef} />
            </div>

            <MessageInput
                recipientId={otherUser.id}
                onMessageSent={scrollToBottom}
            />
        </div>
    );
}; 