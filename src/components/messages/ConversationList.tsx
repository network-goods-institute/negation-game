import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UserIcon, XIcon } from "lucide-react";
import { Conversation } from "@/types/messages";
import { useClosedConversations } from "@/hooks/messages/useClosedConversations";
import { useMemo, useEffect } from "react";
import { generateConversationId } from "@/db/schema";
import { useUser } from "@/queries/users/useUser";

interface ConversationListProps {
    conversations: Conversation[];
    spaceId: string;
    onConversationCountChange?: (count: number) => void;
}

export const ConversationList = ({ conversations, spaceId, onConversationCountChange }: ConversationListProps) => {
    const { data: user } = useUser();
    const { isConversationClosed, reopenConversation, closeConversation, shouldShowClosedConversation, getClosedConversations } = useClosedConversations();

    // Filter conversations: show open ones, and closed ones only if they have NEW messages after closure
    const visibleConversations = useMemo(() => {
        const closedIds = getClosedConversations();
        console.log('Filtering conversations. Total:', conversations.length, 'Closed:', closedIds);

        const filtered = conversations.filter(conversation => {
            const isClosed = isConversationClosed(conversation.conversationId);

            if (!isClosed) {
                // Not closed, always show
                return true;
            }

            // For closed conversations, only show if they have messages after closure
            const shouldShow = shouldShowClosedConversation(conversation.conversationId, conversation.lastMessageCreatedAt);

            if (shouldShow) {
                console.log('Showing closed conversation with NEW messages:', conversation.conversationId, 'last message:', conversation.lastMessageCreatedAt);
            } else {
                console.log('Hiding closed conversation (no new messages):', conversation.conversationId);
            }

            return shouldShow;
        });

        console.log('Visible conversations:', filtered.length);
        return filtered;
    }, [conversations, isConversationClosed, shouldShowClosedConversation, getClosedConversations]);

    // Notify parent component of conversation count changes
    useEffect(() => {
        console.log('Conversation count changed to:', visibleConversations.length);
        onConversationCountChange?.(visibleConversations.length);
    }, [visibleConversations.length, onConversationCountChange]);

    const handleConversationClick = (conversationId: string) => {
        // Reopen the conversation when user clicks on it
        if (isConversationClosed(conversationId)) {
            console.log('User clicked on closed conversation, reopening:', conversationId);
            reopenConversation(conversationId);
        }
    };

    const handleCloseConversation = (e: React.MouseEvent, otherUserId: string) => {
        e.preventDefault(); // Prevent navigation
        e.stopPropagation(); // Prevent card click

        if (user?.id) {
            const conversationId = generateConversationId(user.id, otherUserId, spaceId);
            console.log('User manually closing conversation:', conversationId);
            closeConversation(conversationId);
        }
    };

    return (
        <div className="space-y-3">
            {visibleConversations.map((conversation) => {
                const isClosed = isConversationClosed(conversation.conversationId);
                const hasNewMessage = isClosed && conversation.unreadCount > 0;

                return (
                    <div key={conversation.conversationId} className="relative group">
                        <Link
                            href={`/s/${encodeURIComponent(spaceId)}/messages/${encodeURIComponent(conversation.otherUsername || conversation.otherUserId)}`}
                            className="block"
                            onClick={() => handleConversationClick(conversation.conversationId)}
                        >
                            <Card className="hover:bg-muted/50 hover:shadow-md transition-all duration-200">
                                <CardContent className="p-6">
                                    <div className="flex items-start gap-4">
                                        <Avatar className="size-12 shrink-0 border-2 border-border/20">
                                            <AvatarImage src="" />
                                            <AvatarFallback className="bg-primary/10 text-primary">
                                                {conversation.otherUsername?.[0]?.toUpperCase() || <UserIcon className="size-5" />}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-semibold text-lg truncate">
                                                    {conversation.otherUsername || `User ${conversation.otherUserId}`}
                                                </h3>
                                                <div className="flex items-center gap-2">
                                                    {hasNewMessage && (
                                                        <Badge variant="outline" className="h-5 px-2 text-xs font-medium bg-blue-50 text-blue-700 border-blue-200">
                                                            New message
                                                        </Badge>
                                                    )}
                                                    {conversation.unreadCount > 0 && (
                                                        <Badge variant="destructive" className="h-5 min-w-5 px-2 text-xs font-medium">
                                                            {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-muted-foreground line-clamp-2 leading-relaxed">
                                                {conversation.lastMessageContent}
                                            </p>
                                        </div>

                                        <div className="text-xs text-muted-foreground text-right shrink-0">
                                            {formatDistanceToNow(new Date(conversation.lastMessageCreatedAt), {
                                                addSuffix: true,
                                            })}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>

                        {/* Close button - appears on hover */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6 bg-background/80 hover:bg-background border border-border/50"
                            onClick={(e) => handleCloseConversation(e, conversation.otherUserId)}
                            title="Close conversation"
                        >
                            <XIcon className="size-3" />
                        </Button>
                    </div>
                );
            })}
        </div>
    );
}; 