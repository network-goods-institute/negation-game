"use client";

import React from 'react';
import { AIAssistantChat } from "./AIAssistantChat";
import { AIAssistantRationale } from "./AIAssistantRationale";
import { ChatSidebar, ChatListSkeleton } from '../header/ChatSidebar';
import { ChatHeader, ChatHeaderSkeleton } from '../header/ChatHeader';
import { useAIAssistantController } from '@/hooks/chat/useAIAssistantController';
import { AIAssistantDialogs } from "./AIAssistantDialogs";

export default function AIAssistant() {
    const { sidebarProps, headerProps, chatProps, rationaleProps, dialogsProps, mode } = useAIAssistantController();
    const showSkeleton = sidebarProps.isInitializing;

    return (
        <div className="flex h-[calc(100vh-var(--header-height))] bg-background">
            {showSkeleton ? (
                <div className="w-72 border-r bg-background">
                    <ChatListSkeleton />
                </div>
            ) : (
                <ChatSidebar {...sidebarProps} />
            )}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative transition-all duration-300 ease-in-out">
                {showSkeleton ? (
                    <ChatHeaderSkeleton />
                ) : (
                    <ChatHeader {...headerProps} />
                )}
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