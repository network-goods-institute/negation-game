import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { XIcon, CheckCheckIcon, CheckIcon } from "lucide-react";
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

    const visibleConversations = useMemo(() => {
        const filtered = conversations.filter(conversation => {
            const isClosed = isConversationClosed(conversation.conversationId);

            if (!isClosed) {
                return true;
            }

            return shouldShowClosedConversation(conversation.conversationId, conversation.lastMessageCreatedAt);
        });

        return filtered;
    }, [conversations, isConversationClosed, shouldShowClosedConversation]);

    useEffect(() => {
        onConversationCountChange?.(visibleConversations.length);
    }, [visibleConversations.length, onConversationCountChange]);

    const handleConversationClick = (conversationId: string) => {
        if (isConversationClosed(conversationId)) {
            reopenConversation(conversationId);
        }
    };

    const handleCloseConversation = (e: React.MouseEvent, otherUserId: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (user?.id) {
            const conversationId = generateConversationId(user.id, otherUserId, spaceId);
            closeConversation(conversationId);
        }
    };

    return (
        <div className="space-y-3">
            {visibleConversations.map((conversation) => {
                const isClosed = isConversationClosed(conversation.conversationId);
                const isUnread = conversation.unreadCount > 0;

                return (
                    <div key={conversation.conversationId} className="group relative">
                        <Link
                            href={`/s/${encodeURIComponent(spaceId)}/messages/${encodeURIComponent(conversation.otherUsername || conversation.otherUserId)}`}
                            className="block"
                            onClick={() => handleConversationClick(conversation.conversationId)}
                        >
                            <div className={`relative p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${isUnread
                                    ? 'bg-primary/5 border-primary/20 shadow-sm'
                                    : 'bg-card border-border hover:bg-accent'
                                } ${isClosed ? 'opacity-60' : ''}`}>
                                <div className="flex items-start space-x-4">
                                    {/* Avatar */}
                                    <div className="relative flex-shrink-0">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${isUnread
                                                ? 'bg-primary'
                                                : 'bg-muted-foreground'
                                            }`}>
                                            {conversation.otherUsername?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                        {isUnread && (
                                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full border-2 border-card flex items-center justify-center">
                                                <span className="text-xs text-destructive-foreground font-bold">{conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className={`font-semibold text-base truncate ${isUnread
                                                    ? 'text-foreground'
                                                    : 'text-card-foreground/80'
                                                }`}>
                                                {conversation.otherUsername || `User ${conversation.otherUserId}`}
                                            </h3>
                                            <div className="flex items-center space-x-2 text-sm text-muted-foreground shrink-0">
                                                {conversation.lastMessageSenderId === user?.id && (
                                                    <div className={`${conversation.unreadCount === 0
                                                            ? 'text-endorsed'
                                                            : 'text-muted-foreground'
                                                        }`}>
                                                        {conversation.unreadCount === 0 ?
                                                            <CheckCheckIcon className="w-4 h-4" /> :
                                                            <CheckIcon className="w-4 h-4" />
                                                        }
                                                    </div>
                                                )}
                                                <span className="text-xs">
                                                    {formatDistanceToNow(new Date(conversation.lastMessageCreatedAt), {
                                                        addSuffix: false,
                                                    }).replace('about ', '')}
                                                </span>
                                            </div>
                                        </div>

                                        <p className={`text-sm truncate ${isUnread
                                                ? 'font-medium text-foreground/90'
                                                : 'text-muted-foreground'
                                            }`}>
                                            {conversation.lastMessageContent}
                                        </p>
                                    </div>
                                </div>

                                {/* Close button - simple and effective */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity duration-200 p-1 h-6 w-6 bg-background/90 hover:bg-destructive text-muted-foreground hover:text-destructive-foreground rounded-md shadow-sm border border-border hover:border-destructive"
                                    onClick={(e) => handleCloseConversation(e, conversation.otherUserId)}
                                    title="Close conversation"
                                >
                                    <XIcon className="w-4 h-4" />
                                </Button>
                            </div>
                        </Link>
                    </div>
                );
            })}
        </div>
    );
}; 