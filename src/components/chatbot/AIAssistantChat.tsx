import React from 'react';
import dynamic from 'next/dynamic';
import { ChatLoadingState } from './ChatMessageArea';
import { ChatInputFormSkeleton } from './ChatInputForm';
import type { ChatMessageAreaProps } from './ChatMessageArea';
import type { ChatInputFormProps } from './ChatInputForm';

const ChatMessageArea = dynamic<ChatMessageAreaProps>(
    () => import('./ChatMessageArea').then((mod) => mod.ChatMessageArea),
    { ssr: false, loading: () => <ChatLoadingState /> }
);
const ChatInputForm = dynamic<ChatInputFormProps>(
    () => import('./ChatInputForm').then((mod) => mod.ChatInputForm),
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