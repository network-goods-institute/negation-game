"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendIcon, LoaderIcon } from "lucide-react";
import { useSendMessage } from "@/mutations/messages/useSendMessage";
import { toast } from "sonner";import { logger } from "@/lib/logger";

interface MessageInputProps {
    recipientId: string;
    spaceId: string;
    onMessageSent?: () => void;
}

export const MessageInput = ({ recipientId, spaceId, onMessageSent }: MessageInputProps) => {
    const [content, setContent] = useState("");
    const sendMutation = useSendMessage();

    const handleSend = async () => {
        if (!content.trim() || sendMutation.isPending) return;

        try {
            await sendMutation.mutateAsync({
                recipientId,
                spaceId,
                content: content.trim(),
            });
            setContent("");
            onMessageSent?.();
            toast.success("Message sent");
        } catch (error) {
            logger.error("Failed to send message:", error);
            toast.error("Failed to send message");
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="w-full">
            <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                    <Textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                        className="min-h-[80px] max-h-[200px] resize-none text-base leading-relaxed rounded-lg border-2 border-border focus:border-primary transition-colors bg-background"
                        disabled={sendMutation.isPending}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                        <span>Enter to send • Shift+Enter for new line</span>
                        <span>{content.length} characters</span>
                    </div>
                </div>
                <Button
                    onClick={handleSend}
                    disabled={!content.trim() || sendMutation.isPending}
                    size="lg"
                    className="h-[80px] px-8 font-medium self-start rounded-lg"
                >
                    {sendMutation.isPending ? (
                        <>
                            <LoaderIcon className="size-5 animate-spin mr-2" />
                            Sending
                        </>
                    ) : (
                        <>
                            <SendIcon className="size-5 mr-2" />
                            Send
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}; 