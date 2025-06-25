"use client";

import { useConversations } from "@/queries/messages/useConversations";
import { ConversationList } from "./ConversationList";
import { EmptyMessages } from "./EmptyMessages";
import { LoaderCircleIcon, MessageSquareXIcon } from "lucide-react";
import { useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const MessagesContainer = () => {
    const { data: conversations, isLoading, error } = useConversations();
    const [visibleConversationCount, setVisibleConversationCount] = useState(0);

    const handleConversationCountChange = useCallback((count: number) => {
        setVisibleConversationCount(count);
    }, []);

    if (isLoading) {
        return (
            <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-start space-x-4 p-4 border rounded-lg bg-card">
                        <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-3/4" />
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                            <Skeleton className="h-5 w-5 rounded-full" />
                        </div>
                    </div>
                ))}
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