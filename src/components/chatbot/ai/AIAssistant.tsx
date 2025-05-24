"use client";

import React from 'react';
import dynamic from "next/dynamic";
import { AIAssistantChat } from "./AIAssistantChat";
import { AIAssistantRationale } from "./AIAssistantRationale";
import type { ChatSidebarProps } from '../header/ChatSidebar';
import type { ChatHeaderProps } from '../header/ChatHeader';
import { ChatListSkeleton } from '../header/ChatSidebar';
import { ChatHeaderSkeleton } from '../header/ChatHeader';
import { useAIAssistantController } from '@/hooks/chat/useAIAssistantController';
import { AIAssistantDialogs } from "./AIAssistantDialogs";

// Code-split heavy UI components
const ChatSidebar = dynamic<ChatSidebarProps>(
    () => import("@/components/chatbot/header/ChatSidebar").then((mod) => mod.ChatSidebar),
    { ssr: false, loading: () => <ChatListSkeleton /> }
);
const ChatHeader = dynamic<ChatHeaderProps>(
    () => import("@/components/chatbot/header/ChatHeader").then((mod) => mod.ChatHeader),
    { ssr: false, loading: () => <ChatHeaderSkeleton /> }
);

export default function AIAssistant() {
    const { sidebarProps, headerProps, chatProps, rationaleProps, dialogsProps, mode } = useAIAssistantController();
    return (
        <div className="flex h-[calc(100vh-var(--header-height))] bg-background">
            <ChatSidebar {...sidebarProps} />
            <div className="flex-1 flex flex-col h-full overflow-hidden relative transition-all duration-300 ease-in-out">
                <ChatHeader {...headerProps} />
                {mode === 'chat' ? (
                    <AIAssistantChat {...chatProps} />
                ) : (
                    <AIAssistantRationale {...rationaleProps} />
                )}
            </div>
            <AIAssistantDialogs {...dialogsProps} currentSpace={sidebarProps.currentSpace} showDescEditor={dialogsProps.showDescEditor} mode={mode} />
        </div>
    );
} 