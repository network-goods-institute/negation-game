import { useState } from "react";
import { MessageBubble } from "./MessageBubble";
import { Message } from "@/types/messages";
import { useEditMessage } from "@/mutations/messages/useEditMessage";
import { useDeleteMessage } from "@/mutations/messages/useDeleteMessage";
import { useUser } from "@/queries/users/useUser";
import { toast } from "sonner";

interface MessageListProps {
    messages: Message[];
    currentUserId: string;
    spaceId: string;
}

export const MessageList = ({ messages, currentUserId, spaceId }: MessageListProps) => {
    const { data: user } = useUser();
    const editMutation = useEditMessage(spaceId);
    const deleteMutation = useDeleteMessage(spaceId);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

    const handleEdit = async (messageId: string, newContent: string) => {
        if (!user || !newContent.trim()) return;

        try {
            await editMutation.mutateAsync({
                messageId,
                content: newContent.trim(),
            });

            setEditingMessageId(null);
            toast.success("Message edited");
        } catch (error) {
            toast.error("Failed to edit message");
        }
    };

    const handleDelete = async (messageId: string) => {
        if (!user) return;

        try {
            await deleteMutation.mutateAsync({ messageId });
            toast.success("Message deleted");
        } catch (error) {
            toast.error("Failed to delete message");
        }
    };

    const handleStartEdit = (messageId: string) => {
        setEditingMessageId(messageId);
    };

    const handleCancelEdit = () => {
        setEditingMessageId(null);
    };

    if (messages.length === 0) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="text-center space-y-2">
                    <p className="text-muted-foreground text-lg">
                        No messages yet
                    </p>
                    <p className="text-muted-foreground/60 text-sm">
                        Start the conversation!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="divide-y divide-border/50">
            {messages.map((message) => (
                <MessageBubble
                    key={message.id}
                    message={message}
                    senderUsername={message.senderId === currentUserId ? "You" : message.senderUsername}
                    isOwn={message.senderId === currentUserId}
                    isEditing={editingMessageId === message.id}
                    showReadIndicator={user?.receiveReadReceipts ?? true}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onStartEdit={handleStartEdit}
                    onCancelEdit={handleCancelEdit}
                />
            ))}
        </div>
    );
}; 