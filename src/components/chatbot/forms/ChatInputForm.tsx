"use client";

import React from "react";
import { AutosizeTextarea } from "@/components/ui/autosize-textarea";
import { AuthenticatedActionButton } from "@/components/editor/AuthenticatedActionButton";
import { SlidersHorizontal, Loader2 } from "lucide-react";

export const ChatInputFormSkeleton = () => (
    <div className="fixed bottom-0 border-t bg-background p-4 left-0 md:left-[var(--sidebar-width)] right-0 z-20 animate-pulse">
        <div className="w-full lg:max-w-3xl xl:max-w-4xl mx-auto h-10 bg-muted rounded" />
    </div>
);

export interface ChatInputFormProps {
    message: string;
    setMessage: (value: string) => void;
    isGenerating: boolean;
    isAuthenticated: boolean;
    isInitializing: boolean;
    isMobile: boolean;
    currentSpace: string | null;
    onSubmit: (e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    onShowSettings: () => void;
    hideSettings?: boolean;
}

export function ChatInputForm({
    message,
    setMessage,
    isGenerating,
    isAuthenticated,
    isInitializing,
    isMobile,
    currentSpace,
    onSubmit,
    onKeyDown,
    onShowSettings,
    hideSettings = false,
}: ChatInputFormProps) {
    return (
        <div
            className={`fixed bottom-0 border-t bg-background ${isMobile ? "p-2" : "p-4"} left-0 right-0 z-20`}
        >
            <form
                className={`w-full lg:max-w-3xl xl:max-w-4xl mx-auto flex items-end gap-2 md:gap-3`}
                onSubmit={onSubmit}
            >
                <AutosizeTextarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={
                        !isAuthenticated
                            ? "Login to chat..."
                            : isGenerating
                                ? "Waiting for response..."
                                : isMobile
                                    ? "Type your message here..."
                                    : "Type your message here... (Enter to send)"
                    }
                    className={`flex-1 py-2.5 px-3 md:px-4 text-xs sm:text-sm md:text-base rounded-lg border shadow-sm resize-none focus-visible:ring-1 focus-visible:ring-ring`}
                    disabled={
                        isGenerating ||
                        isInitializing ||
                        !currentSpace ||
                        !isAuthenticated
                    }
                    minHeight={40}
                    maxHeight={isMobile ? 100 : 160}
                    onKeyDown={onKeyDown}
                />
                <AuthenticatedActionButton
                    type="submit"
                    disabled={
                        isGenerating ||
                        !message.trim() ||
                        !isAuthenticated ||
                        isInitializing
                    }
                    className="rounded-lg h-9 w-9 md:h-10 md:w-10 flex items-center justify-center"
                    title={isGenerating ? "Sending..." : "Send Message (Enter)"}
                >
                    {isGenerating ? (
                        <Loader2 className="h-5 w-5 animate-spin text-current" />
                    ) : (
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="h-4 w-4"
                        >
                            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                        </svg>
                    )}
                </AuthenticatedActionButton>
                {!hideSettings && (
                    <AuthenticatedActionButton
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onShowSettings}
                        className="rounded-lg h-9 w-9 md:h-10 md:w-10 text-muted-foreground hover:text-foreground"
                        title="Chat Settings"
                    >
                        <SlidersHorizontal className="h-4 w-4" />
                    </AuthenticatedActionButton>
                )}
            </form>
        </div>
    );
} 