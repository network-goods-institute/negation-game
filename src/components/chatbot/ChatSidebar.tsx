import React from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Plus, Trash2, X, Pencil, Share2, ExternalLink } from "lucide-react";
import * as ContextMenu from "@radix-ui/react-context-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { AuthenticatedActionButton } from "@/components/ui/AuthenticatedActionButton";
import { SavedChat } from '@/types/chat';
import { Skeleton } from '../ui/skeleton';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

const ChatListSkeleton = () => {
    return (
        <div className="p-3 space-y-3">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="px-4 py-3 rounded-xl">
                    <div className="flex flex-col space-y-2">
                        <Skeleton className="h-4 w-4/5" />
                        <Skeleton className="h-3 w-2/3" />
                    </div>
                </div>
            ))}
        </div>
    );
};

interface ChatSidebarProps {
    isMobile: boolean;
    showMobileMenu: boolean;
    isInitializing: boolean;
    isAuthenticated: boolean;
    savedChats: SavedChat[];
    currentChatId: string | null;
    currentSpace: string | null;
    onSwitchChat: (chatId: string) => void;
    onNewChat: () => void;
    onTriggerDeleteAll: () => void;
    onTriggerRename: (chatId: string, currentTitle: string) => void;
    onTriggerDelete: (chatId: string) => void;
    onCloseMobileMenu: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
    isMobile,
    showMobileMenu,
    isInitializing,
    isAuthenticated,
    savedChats,
    currentChatId,
    currentSpace,
    onSwitchChat,
    onNewChat,
    onTriggerDeleteAll,
    onTriggerRename,
    onTriggerDelete,
    onCloseMobileMenu,
}) => {
    const handleShareChat = (chatId: string) => {
        if (!currentSpace) {
            toast.error("Cannot share chat: Space context is missing.");
            return;
        }
        if (!isAuthenticated) {
            toast.error("Login required to share chats.");
            return;
        }

        const shareUrl = `${window.location.origin}/s/${currentSpace}/chat?importChat=${chatId}`;
        toast.success(
            <div className="flex flex-col gap-1">
                <span>Share link copied!</span>
                <Input
                    readOnly
                    value={shareUrl}
                    className="text-xs h-7 bg-background text-foreground"
                    onClick={(e) => {
                        const input = e.target as HTMLInputElement;
                        input.select();
                        navigator.clipboard.writeText(shareUrl)
                            .then(() => console.log('Share URL copied to clipboard'))
                            .catch(err => console.error('Failed to copy share URL: ', err));
                    }}
                />
                <span className="text-xs text-muted-foreground">(Click input to copy)</span>
            </div>,
            { duration: 10000 }
        );
        navigator.clipboard.writeText(shareUrl)
            .then(() => console.log('Share URL copied to clipboard automatically'))
            .catch(err => console.error('Failed to copy share URL automatically: ', err));
    };

    return (
        <div className={`${isMobile ? 'fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out' : 'w-72 border-r flex-shrink-0'}
            ${isMobile ? (showMobileMenu ? 'translate-x-0' : '-translate-x-full') : ''}
            ${isMobile ? 'w-72 bg-background border-r' : 'bg-background/90'}`}>
            <div className="h-full flex flex-col">
                {/* Sidebar Header */}
                <div className="h-16 border-b flex items-center justify-between px-4 md:px-6">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        <span className="text-base md:text-lg">Chats</span>
                    </h2>
                    <div className="flex items-center gap-1">
                        <TooltipProvider delayDuration={200}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <AuthenticatedActionButton
                                        variant="ghost" size="icon"
                                        className="rounded-full h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        onClick={onTriggerDeleteAll}
                                        disabled={savedChats.length === 0 || !isAuthenticated || isInitializing}
                                        title="Delete All Chats"
                                    ><Trash2 className="h-4 w-4" /></AuthenticatedActionButton>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" sideOffset={5}>Delete All Chats ({savedChats.length})</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <AuthenticatedActionButton
                            variant="ghost" size="icon"
                            onClick={onNewChat}
                            title="New Chat"
                            className="rounded-full h-8 w-8"
                        ><Plus className="h-4 w-4" /></AuthenticatedActionButton>
                        {isMobile && (
                            <Button variant="ghost" size="icon" onClick={onCloseMobileMenu} className="rounded-full h-8 w-8"><X className="h-4 w-4" /></Button>
                        )}
                    </div>
                </div>
                {/* Chat List */}
                <ScrollArea className="flex-1">
                    {isInitializing ? (
                        <ChatListSkeleton />
                    ) : savedChats.length === 0 ? (
                        <div className="text-center py-8 px-4 text-muted-foreground"><p className="text-sm">No chats yet</p><p className="text-xs mt-1">Start a new conversation!</p></div>
                    ) : (
                        <div className="p-2 md:p-3 space-y-1.5 md:space-y-2">
                            {savedChats.map((chat) => (
                                <ContextMenu.Root key={chat.id}>
                                    <ContextMenu.Trigger className="w-full" disabled={!isAuthenticated}>
                                        <div
                                            className={`relative group px-3 py-2.5 md:px-4 md:py-3 rounded-lg cursor-pointer flex items-center transition-colors duration-150 ${chat.id === currentChatId ? 'bg-accent shadow-sm' : 'hover:bg-accent/50'}`}
                                            onClick={() => onSwitchChat(chat.id)}
                                        >
                                            <div className="flex-1 min-w-0 mr-2">
                                                <TooltipProvider delayDuration={300}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className={`block text-xs md:text-sm ${chat.id === currentChatId ? 'font-semibold text-accent-foreground' : 'text-foreground'} overflow-hidden text-ellipsis whitespace-nowrap`}>
                                                                {((): string => { const max = isMobile ? 20 : 15; return chat.title.length > max ? `${chat.title.slice(0, max)}...` : chat.title; })()}
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="right" className="max-w-[250px] break-words" sideOffset={5}>{chat.title}</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                                <span className="text-xs text-muted-foreground truncate block mt-0.5">
                                                    {new Date(chat.updatedAt).toLocaleDateString()} · {chat.messages.filter(m => m.role === 'user' || m.role === 'assistant').length} msg
                                                </span>
                                            </div>
                                            <div className={`flex items-center shrink-0 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                                                <AuthenticatedActionButton
                                                    variant="ghost" size="icon" className={`h-6 w-6 text-muted-foreground hover:text-primary`}
                                                    onClick={(e) => { e.stopPropagation(); onTriggerRename(chat.id, chat.title); }}
                                                    title="Rename chat"
                                                ><Pencil className="h-3.5 w-3.5" /></AuthenticatedActionButton>
                                                <AuthenticatedActionButton
                                                    variant="ghost" size="icon" className={`h-6 w-6 text-muted-foreground hover:text-primary`}
                                                    onClick={(e) => { e.stopPropagation(); handleShareChat(chat.id); }}
                                                    disabled={!isAuthenticated}
                                                    title="Share chat"
                                                ><ExternalLink className="h-3.5 w-3.5" /></AuthenticatedActionButton>
                                                <AuthenticatedActionButton
                                                    variant="ghost" size="icon" className={`h-6 w-6 text-muted-foreground hover:text-destructive`}
                                                    onClick={(e) => { e.stopPropagation(); onTriggerDelete(chat.id); }}
                                                    title="Delete chat"
                                                ><Trash2 className="h-3.5 w-3.5" /></AuthenticatedActionButton>
                                            </div>
                                        </div>
                                    </ContextMenu.Trigger>
                                    <ContextMenu.Content className="min-w-[160px] bg-popover text-popover-foreground rounded-md border shadow-md p-1 z-50">
                                        <ContextMenu.Item className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent focus:bg-accent hover:text-accent-foreground focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50" onSelect={() => { onTriggerRename(chat.id, chat.title); }} disabled={!isAuthenticated}>Rename</ContextMenu.Item>
                                        <ContextMenu.Item
                                            className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent focus:bg-accent hover:text-accent-foreground focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                            disabled={!isAuthenticated}
                                            onSelect={(event) => {
                                                event.preventDefault(); // Prevent default context menu closing if needed
                                                handleShareChat(chat.id);
                                            }}
                                        >
                                            Share
                                        </ContextMenu.Item>
                                        <ContextMenu.Separator className="h-[1px] bg-border m-[5px]" />
                                        <ContextMenu.Item className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-destructive focus:bg-destructive hover:text-destructive-foreground focus:text-destructive-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50" onSelect={() => onTriggerDelete(chat.id)} disabled={!isAuthenticated}>Delete</ContextMenu.Item>
                                    </ContextMenu.Content>
                                </ContextMenu.Root>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </div>
        </div>
    );
}; 