"use client";

import { useConversations } from "@/queries/messages/useConversations";
import { ConversationList } from "./ConversationList";
import { EmptyMessages } from "./EmptyMessages";
import { MessageSquareXIcon, SearchIcon, XIcon } from "lucide-react";
import { useState, useCallback, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMessageKeyboardShortcuts } from "@/hooks/messages/useMessageKeyboardShortcuts";

interface MessagesContainerProps {
    spaceId: string;
}

export const MessagesContainer = ({ spaceId }: MessagesContainerProps) => {
    const { data: conversations, isLoading, error } = useConversations(spaceId);
    const [visibleConversationCount, setVisibleConversationCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const searchInputRef = useRef<HTMLInputElement>(null);

    const handleConversationCountChange = useCallback((count: number) => {
        setVisibleConversationCount(count);
    }, []);

    const filteredConversations = useMemo(() => {
        if (!conversations || !searchQuery.trim()) {
            return conversations || [];
        }

        const query = searchQuery.toLowerCase().trim();
        return conversations.filter(conversation => 
            conversation.otherUsername?.toLowerCase().includes(query) ||
            conversation.lastMessageContent?.toLowerCase().includes(query)
        );
    }, [conversations, searchQuery]);

    const clearSearch = useCallback(() => {
        setSearchQuery("");
    }, []);

    const focusSearch = useCallback(() => {
        searchInputRef.current?.focus();
    }, []);

    useMessageKeyboardShortcuts({
        onEscape: clearSearch,
        onSearch: focusSearch,
    });

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

    const displayConversations = searchQuery.trim() ? filteredConversations : conversations;
    const showingFiltered = searchQuery.trim() && filteredConversations.length !== conversations.length;

    return (
        <div className="h-full flex flex-col">
            {/* Search bar */}
            <div className="mb-6">
                <div className="relative">
                    <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-12 pr-12 h-12 rounded-lg"
                    />
                    {searchQuery && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearSearch}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-accent rounded-full"
                        >
                            <XIcon className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Conversation count */}
            {displayConversations.length > 0 && (
                <div className="mb-4">
                    <p className="text-sm text-muted-foreground font-medium">
                        {showingFiltered ? (
                            <>
                                {filteredConversations.length} of {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
                            </>
                        ) : (
                            <>
                                {visibleConversationCount} conversation{visibleConversationCount !== 1 ? 's' : ''}
                            </>
                        )}
                    </p>
                </div>
            )}

            {/* Scrollable conversation list */}
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                {/* No search results */}
                {searchQuery.trim() && filteredConversations.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center space-y-4">
                            <SearchIcon className="h-16 w-16 text-muted-foreground/40 mx-auto" />
                            <div>
                                <p className="text-foreground font-semibold text-lg mb-2">No conversations found</p>
                                <p className="text-muted-foreground">
                                    Try different search terms
                                </p>
                            </div>
                        </div>
                    </div>
                ) : displayConversations.length > 0 ? (
                    <ConversationList
                        conversations={displayConversations}
                        spaceId={spaceId}
                        onConversationCountChange={handleConversationCountChange}
                    />
                ) : null}
            </div>
        </div>
    );
}; 