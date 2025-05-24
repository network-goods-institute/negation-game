import React from 'react';
import dynamic from 'next/dynamic';
import { ChatLoadingState } from '../header/ChatMessageArea';
import { ChatInputFormSkeleton } from '../forms/ChatInputForm';
import type { ChatMessageAreaProps } from '../header/ChatMessageArea';
import type { ChatInputFormProps } from '../forms/ChatInputForm';

const ChatMessageArea = dynamic<ChatMessageAreaProps>(
    () => import('../header/ChatMessageArea').then((mod) => mod.ChatMessageArea),
    { ssr: false, loading: () => <ChatLoadingState /> }
);
const ChatInputForm = dynamic<ChatInputFormProps>(
    () => import('../forms/ChatInputForm').then((mod) => mod.ChatInputForm),
    { ssr: false, loading: () => <ChatInputFormSkeleton /> }
);

export type AIAssistantChatProps = ChatMessageAreaProps &
    Pick<ChatInputFormProps, 'message' | 'setMessage' | 'onSubmit' | 'onKeyDown' | 'onShowSettings'>;

export function AIAssistantChat({
    isInitializing,
    isFetchingRationales,
    chatState,
    isGeneratingCurrent,
    isFetchingCurrentContext,
    currentStreamingContent,
    chatList,
    discourse,
    isAuthenticated,
    userRationales,
    availableRationales,
    currentSpace,
    isMobile,
    initialOptions,
    onStartChatOption,
    onTriggerEdit,
    message,
    setMessage,
    onSubmit,
    onKeyDown,
    onShowSettings,
}: AIAssistantChatProps) {
    return (
        <>
            <ChatMessageArea
                isInitializing={isInitializing}
                isFetchingRationales={isFetchingRationales}
                chatState={chatState}
                isGeneratingCurrent={isGeneratingCurrent}
                isFetchingCurrentContext={isFetchingCurrentContext}
                currentStreamingContent={currentStreamingContent}
                chatList={chatList}
                discourse={discourse}
                isAuthenticated={isAuthenticated}
                userRationales={userRationales}
                availableRationales={availableRationales}
                currentSpace={currentSpace}
                isMobile={isMobile}
                initialOptions={initialOptions}
                onStartChatOption={onStartChatOption}
                onTriggerEdit={onTriggerEdit}
            />
            <ChatInputForm
                message={message}
                setMessage={setMessage}
                isGenerating={isGeneratingCurrent}
                isAuthenticated={isAuthenticated}
                isInitializing={isInitializing}
                isMobile={isMobile}
                currentSpace={currentSpace}
                onSubmit={onSubmit}
                onKeyDown={onKeyDown}
                onShowSettings={onShowSettings}
            />
        </>
    );
} 