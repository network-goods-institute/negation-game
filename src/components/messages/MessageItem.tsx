"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MoreHorizontalIcon, EditIcon, TrashIcon } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEditMessage } from "@/mutations/messages/useEditMessage";
import { useDeleteMessage } from "@/mutations/messages/useDeleteMessage";
import { Input } from "@/components/ui/input";
import { Message } from "@/types/messages";

interface MessageItemProps {
    message: Message;
    isOwn: boolean;
}

export const MessageItem = ({ message, isOwn }: MessageItemProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.content);

    const editMutation = useEditMessage();
    const deleteMutation = useDeleteMessage();

    const handleEdit = async () => {
        if (editContent.trim() && editContent !== message.content) {
            try {
                await editMutation.mutateAsync({
                    messageId: message.id,
                    content: editContent.trim(),
                });
                setIsEditing(false);
            } catch (error) {
                console.error("Failed to edit message:", error);
            }
        } else {
            setIsEditing(false);
            setEditContent(message.content);
        }
    };

    const handleDelete = async () => {
        try {
            await deleteMutation.mutateAsync({ messageId: message.id });
        } catch (error) {
            console.error("Failed to delete message:", error);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleEdit();
        } else if (e.key === "Escape") {
            setIsEditing(false);
            setEditContent(message.content);
        }
    };

    return (
        <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[70%]", isOwn ? "order-2" : "order-1")}>
                <Card className={cn(
                    "relative group",
                    isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                    <CardContent className="p-3">
                        {isEditing ? (
                            <div className="space-y-2">
                                <Input
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    onBlur={handleEdit}
                                    autoFocus
                                    className="bg-background text-foreground"
                                />
                                <div className="text-xs opacity-70">
                                    Press Enter to save, Escape to cancel
                                </div>
                            </div>
                        ) : (
                            <>
                                <p className="text-sm">{message.content}</p>
                                {message.isEdited && (
                                    <p className="text-xs opacity-70 mt-1">(edited)</p>
                                )}
                            </>
                        )}

                        <div className="flex items-center justify-between mt-2">
                            <span className="text-xs opacity-70">
                                {formatDistanceToNow(new Date(message.createdAt), {
                                    addSuffix: true,
                                })}
                            </span>

                            {isOwn && !isEditing && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                                        >
                                            <MoreHorizontalIcon className="size-3" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => setIsEditing(true)}>
                                            <EditIcon className="size-3 mr-2" />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={handleDelete}
                                            className="text-destructive"
                                        >
                                            <TrashIcon className="size-3 mr-2" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}; 