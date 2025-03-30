"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

interface DiscourseMessage {
    id: number;
    content: string;
    raw: string;
    created_at: string;
    topic_id?: number;
    topic_title?: string;
}

export default function AIAssistant() {
    const [isConnectingToDiscourse, setIsConnectingToDiscourse] = useState(false);
    const [isDiscourseConnected, setIsDiscourseConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [discourseUsername, setDiscourseUsername] = useState('');
    const [discourseUrl, setDiscourseUrl] = useState('https://forum.scroll.io');
    const [storedMessages, setStoredMessages] = useState<DiscourseMessage[]>([]);
    const [showMessagesModal, setShowMessagesModal] = useState(false);

    useEffect(() => {
        const savedMessages = document.cookie
            .split('; ')
            .find(row => row.startsWith('discourse_messages='));
        if (savedMessages) {
            const messages = JSON.parse(decodeURIComponent(savedMessages.split('=')[1]));
            setStoredMessages(messages);
            setIsDiscourseConnected(true);
        }
    }, []);

    const saveMessagesToCookie = (messages: DiscourseMessage[]) => {
        const oneDay = 24 * 60 * 60 * 1000;
        document.cookie = `discourse_messages=${encodeURIComponent(JSON.stringify(messages))}; path=/; max-age=${oneDay}`;
        setStoredMessages(messages);
    };

    const handleConnectToDiscourse = async () => {
        try {
            if (!discourseUsername.trim()) {
                setError('Please enter your username');
                return;
            }

            setIsConnectingToDiscourse(true);
            setError(null);

            const cleanUrl = discourseUrl.trim().replace(/\/$/, '');
            const encodedUrl = encodeURIComponent(cleanUrl);

            const response = await fetch(`/api/discourse/posts?username=${discourseUsername}&url=${encodedUrl}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch user messages');
            }

            const data = await response.json();
            const messages = data.latest_posts || [];

            const processedMessages = messages.map((msg: any) => ({
                id: msg.id,
                content: msg.cooked || msg.raw || msg.content || '',
                raw: msg.raw || msg.content || '',
                created_at: msg.created_at,
                topic_id: msg.topic_id,
                topic_title: msg.topic?.title || msg.topic_title
            }));

            saveMessagesToCookie(processedMessages);
            setIsDiscourseConnected(true);

        } catch (error) {
            setError('Failed to fetch messages. Please check the username and try again.');
        } finally {
            setIsConnectingToDiscourse(false);
        }
    };

    return (
        <div className="h-screen flex flex-col">
            <div className="bg-background border-b">
                <div className="flex items-center justify-between h-14 px-4">
                    <h2 className="text-lg font-semibold">Connect to Discourse</h2>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="max-w-2xl mx-auto p-4 space-y-4">
                    {!isDiscourseConnected ? (
                        <div className="text-center space-y-4 py-8">
                            <h3 className="text-lg font-medium">Connect Your Discourse Messages</h3>
                            <p className="text-sm text-muted-foreground">
                                Enter your username to view your messages.
                            </p>
                            <div className="flex flex-col gap-4 items-center">
                                <div className="w-full max-w-sm space-y-2">
                                    <Label htmlFor="discourse-url">Discourse URL</Label>
                                    <Input
                                        id="discourse-url"
                                        type="text"
                                        placeholder="https://forum.scroll.io"
                                        value={discourseUrl}
                                        onChange={(e) => setDiscourseUrl(e.target.value)}
                                        className="w-full"
                                    />
                                </div>
                                <div className="w-full max-w-sm space-y-2">
                                    <Label htmlFor="discourse-username">Username</Label>
                                    <Input
                                        id="discourse-username"
                                        type="text"
                                        placeholder="username"
                                        value={discourseUsername}
                                        onChange={(e) => setDiscourseUsername(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleConnectToDiscourse();
                                            }
                                        }}
                                        className="w-full"
                                    />
                                </div>
                                <Button
                                    onClick={handleConnectToDiscourse}
                                    disabled={isConnectingToDiscourse || !discourseUsername.trim()}
                                >
                                    {isConnectingToDiscourse ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Connecting...
                                        </>
                                    ) : (
                                        'Connect Messages'
                                    )}
                                </Button>
                            </div>
                            {error && (
                                <p className="text-sm text-destructive">{error}</p>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                            <p className="text-center text-muted-foreground">
                                Connected to {discourseUrl} as @{discourseUsername}
                            </p>
                            <Button onClick={() => setShowMessagesModal(true)}>
                                View Messages
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Messages Modal */}
            <Dialog open={showMessagesModal} onOpenChange={setShowMessagesModal}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Your Discourse Messages</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                        <div className="space-y-4">
                            {storedMessages.map((message) => (
                                <div key={message.id} className="space-y-2">
                                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                                        <span>{new Date(message.created_at).toLocaleString()}</span>
                                        {message.topic_title && (
                                            <span className="text-primary">
                                                {message.topic_title}
                                            </span>
                                        )}
                                    </div>
                                    <div
                                        className="rounded-lg bg-muted p-3"
                                        dangerouslySetInnerHTML={{
                                            __html: message.content || message.raw
                                        }}
                                    />
                                </div>
                            ))}
                            {storedMessages.length === 0 && (
                                <div className="text-center text-muted-foreground py-8">
                                    No messages found
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    );
} 