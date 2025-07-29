"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendIcon, LoaderIcon } from "lucide-react";
import { useSendMessage } from "@/mutations/messages/useSendMessage";
import { toast } from "sonner";

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
            console.error("Failed to send message:", error);
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
        <div className="sticky bottom-0 bg-background border-t border-border/80 p-6 shadow-lg">
            <div className="flex gap-4 items-end max-w-4xl mx-auto">
                <div className="flex-1 space-y-2">
                    <Textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                        className="min-h-[60px] max-h-[160px] resize-none text-base leading-relaxed border-2 focus:border-primary/50 transition-colors"
                        disabled={sendMutation.isPending}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Enter to send • Shift+Enter for new line</span>
                        <span>{content.length} characters</span>
                    </div>
                </div>
                <Button
                    onClick={handleSend}
                    disabled={!content.trim() || sendMutation.isPending}
                    size="lg"
                    className="h-[60px] px-6 font-medium self-start"
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