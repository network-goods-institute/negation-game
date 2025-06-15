"use client";

import { useConversations } from "@/queries/messages/useConversations";
import { ConversationList } from "./ConversationList";
import { EmptyMessages } from "./EmptyMessages";
import { LoaderCircleIcon, MessageSquareXIcon } from "lucide-react";
import { useState, useCallback } from "react";

export const MessagesContainer = () => {
    const { data: conversations, isLoading, error } = useConversations();
    const [visibleConversationCount, setVisibleConversationCount] = useState(0);

    const handleConversationCountChange = useCallback((count: number) => {
        setVisibleConversationCount(count);
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                    <LoaderCircleIcon className="animate-spin size-8 text-primary" />
                    <p className="text-muted-foreground">Loading your conversations...</p>
                </div>
            </div>
        );
    }

    if (error) {
        const isAuthError = error instanceof Error && error.message.includes("Must be authenticated");

        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <MessageSquareXIcon className="size-12 text-red-500 mx-auto mb-3" />
                    <p className="text-red-500 font-medium mb-2">
                        {isAuthError ? "Authentication required" : "Failed to load conversations"}
                    </p>
                    <p className="text-muted-foreground text-sm">
                        {isAuthError ? "Please log in to view your messages" : "Please try refreshing the page"}
                    </p>
                </div>
            </div>
        );
    }

    if (!conversations || conversations.length === 0) {
        return <EmptyMessages />;
    }

    return (
        <div className="space-y-4">
            {/* Conversation count */}
            <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                    {visibleConversationCount} conversation{visibleConversationCount !== 1 ? 's' : ''}
                </p>
            </div>

            <ConversationList
                conversations={conversations}
                onConversationCountChange={handleConversationCountChange}
            />
        </div>
    );
}; 