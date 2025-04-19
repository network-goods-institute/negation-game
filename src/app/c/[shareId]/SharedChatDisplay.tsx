"use client";

import { ChatMessage } from "@/types/chat";
import { MemoizedMarkdown } from "@/components/ui/MemoizedMarkdown";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DetailedSourceList } from "@/components/chatbot/DetailedSourceList";
import { MessageSquare } from 'lucide-react';

interface SharedChatDisplayProps {
    title: string;
    messages: ChatMessage[];
}

export default function SharedChatDisplay({ title, messages }: SharedChatDisplayProps) {
    const displayMessages = messages.filter(m => m.role !== 'system');

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] md:h-auto md:max-h-[calc(100vh-6rem)]"> {/* Adjust height for mobile/desktop */}
            <div className="p-4 border-b bg-muted/50">
                <h1 className="text-lg font-semibold truncate flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    {title}
                </h1>
                <p className="text-xs text-muted-foreground mt-1">Shared Chat (Read-only)</p>
            </div>
            <ScrollArea className="flex-1 overflow-y-auto">
                <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                    {displayMessages.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">This chat has no messages yet.</p>
                    ) : (
                        displayMessages.map((msg, i) => (
                            <div key={`shared-${i}`} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-xl md:rounded-2xl p-3 md:p-4 shadow-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card text-card-foreground'}`}>
                                    <MemoizedMarkdown
                                        content={msg.content}
                                        id={`msg-${i}`}
                                        isUserMessage={msg.role === 'user'}
                                        space={null}
                                        discourseUrl=""
                                        storedMessages={[]}
                                    />
                                    {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                                        <div className="mt-2 pt-1">
                                            <DetailedSourceList
                                                sources={msg.sources}
                                                space={null}
                                                discourseUrl=""
                                                storedMessages={[]}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
} 