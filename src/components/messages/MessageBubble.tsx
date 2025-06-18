import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckIcon, ClockIcon, XCircleIcon, TrashIcon, EditIcon, XIcon, CopyIcon, EyeIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils/cn";
import { Message } from "@/types/messages";
import { toast } from "sonner";

interface MessageBubbleProps {
    message: Message & {
        _optimistic?: boolean;
        _status?: 'sending' | 'sent' | 'failed';
        _error?: string;
    };
    senderUsername?: string;
    senderImage?: string;
    isOwn: boolean;
    isEditing?: boolean;
    showReadIndicator?: boolean;
    onEdit?: (messageId: string, newContent: string) => void;
    onDelete?: (messageId: string) => void;
    onStartEdit?: (messageId: string) => void;
    onCancelEdit?: () => void;
}

export function MessageBubble({
    message,
    senderUsername,
    senderImage,
    isOwn,
    isEditing = false,
    showReadIndicator = false,
    onEdit,
    onDelete,
    onStartEdit,
    onCancelEdit,
}: MessageBubbleProps) {
    const [editContent, setEditContent] = useState(message.content);
    const [clickedButton, setClickedButton] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.select();
        }
    }, [isEditing]);

    const handleSaveEdit = () => {
        if (onEdit && editContent.trim() !== message.content) {
            onEdit(message.id, editContent.trim());
        } else {
            onCancelEdit?.();
        }
    };

    const handleCancelEdit = () => {
        setEditContent(message.content);
        onCancelEdit?.();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSaveEdit();
        } else if (e.key === 'Escape') {
            handleCancelEdit();
        }
    };

    const handleButtonClick = async (action: string, callback: () => void | Promise<void>) => {
        setClickedButton(action);
        try {
            await callback();
            // Keep checkmark for a moment then clear
            setTimeout(() => setClickedButton(null), 1000);
        } catch (error) {
            setClickedButton(null);
        }
    };

    const handleCopy = async () => {
        await handleButtonClick('copy', async () => {
            await navigator.clipboard.writeText(message.isDeleted ? "This message was deleted" : message.content);
            toast.success("Message copied to clipboard");
        });
    };

    const handleEdit = () => {
        handleButtonClick('edit', () => {
            onStartEdit?.(message.id);
        });
    };

    const handleDelete = () => {
        handleButtonClick('delete', () => {
            onDelete?.(message.id);
        });
    };

    const getStatusIcon = () => {
        if (message._status === 'sending') {
            return <ClockIcon className="size-3 text-muted-foreground" />;
        }
        if (message._status === 'failed') {
            return <XCircleIcon className="size-3 text-destructive" />;
        }
        if (message._status === 'sent' || !message._optimistic) {
            return <CheckIcon className="size-3 text-muted-foreground" />;
        }
        return null;
    };

    return (
        <div className={cn(
            "group flex gap-3 p-4 transition-colors hover:bg-muted/30",
            isOwn && "flex-row-reverse"
        )}>
            <Avatar className="size-8 flex-shrink-0">
                <AvatarImage src={senderImage} />
                <AvatarFallback className="bg-primary/10 text-primary">
                    {senderUsername?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
            </Avatar>

            <div className={cn("flex-1 min-w-0 space-y-1")}>
                {/* Header with username and timestamp */}
                <div className={cn("flex items-baseline gap-2", isOwn && "flex-row-reverse")}>
                    {!isOwn && (
                        <span className="text-sm font-semibold text-foreground">
                            {senderUsername || "Unknown User"}
                        </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(message.createdAt, { addSuffix: true })}
                        {message.isEdited && !message.isDeleted && " • edited"}
                    </span>
                </div>

                {isEditing ? (
                    /* Editing mode */
                    <div className="space-y-2">
                        <Textarea
                            ref={textareaRef}
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="min-h-[60px] resize-none"
                            placeholder="Edit your message..."
                        />
                        <div className="flex gap-2 justify-start">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancelEdit}
                                className="h-8 px-3"
                            >
                                <XIcon className="size-4 mr-2" />
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSaveEdit}
                                disabled={!editContent.trim()}
                                className="h-8 px-3"
                            >
                                <CheckIcon className="size-4 mr-2" />
                                Save
                            </Button>
                        </div>
                    </div>
                ) : (
                    /* Normal message display */
                    <div className="space-y-1">
                        {/* Message bubble container with proper alignment */}
                        <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                            <div
                                className={cn(
                                    "inline-block min-w-[200px] max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed",
                                    isOwn
                                        ? "bg-primary text-primary-foreground rounded-br-md"
                                        : "bg-muted text-foreground rounded-bl-md",
                                    message._status === 'failed' && "opacity-60",
                                    message.isDeleted && "bg-muted/60 text-muted-foreground italic"
                                )}
                            >
                                <p className="whitespace-pre-wrap break-words text-left">
                                    {message.isDeleted ? "This message was deleted" : message.content}
                                </p>

                                {!message.isDeleted && (
                                    <div className="flex items-center gap-1 mt-1 justify-start">
                                        {getStatusIcon()}
                                        {showReadIndicator && isOwn && message.readAt && (
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <EyeIcon className="size-3" />
                                                <span>Seen</span>
                                            </div>
                                        )}
                                        {message._status === 'failed' && message._error && (
                                            <span className="text-xs text-destructive">
                                                Failed
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action buttons underneath the message bubble */}
                        {!isEditing && (
                            <div className={cn(
                                "flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity",
                                isOwn ? "justify-end" : "justify-start"
                            )}>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleCopy}
                                    className="h-6 px-2 text-xs"
                                    title="Copy message"
                                >
                                    {clickedButton === 'copy' ? (
                                        <CheckIcon className="size-3 text-green-600" />
                                    ) : (
                                        <CopyIcon className="size-3" />
                                    )}
                                </Button>

                                {!message.isDeleted && isOwn && (
                                    <>
                                        {onStartEdit && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={handleEdit}
                                                className="h-6 px-2 text-xs"
                                                title="Edit message"
                                            >
                                                {clickedButton === 'edit' ? (
                                                    <CheckIcon className="size-3 text-green-600" />
                                                ) : (
                                                    <EditIcon className="size-3" />
                                                )}
                                            </Button>
                                        )}
                                        {onDelete && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={handleDelete}
                                                className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                                                title="Delete message"
                                            >
                                                {clickedButton === 'delete' ? (
                                                    <CheckIcon className="size-3 text-green-600" />
                                                ) : (
                                                    <TrashIcon className="size-3" />
                                                )}
                                            </Button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
} 