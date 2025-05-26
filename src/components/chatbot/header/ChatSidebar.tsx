import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Plus, Trash2, X, Pencil, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import * as ContextMenu from "@radix-ui/react-context-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { AuthenticatedActionButton } from "@/components/editor/AuthenticatedActionButton";
import { SavedChat } from '@/types/chat';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { usePrivy } from '@privy-io/react-auth';

export const ChatListSkeleton = () => {
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

interface ChatListItemProps {
    chat: SavedChat;
    currentChatId: string | null;
    isAuthenticated: boolean;
    isMobile: boolean;
    generatingTitles: Set<string>;
    onSwitchChat: (chatId: string) => void;
    onTriggerRename: (chatId: string, currentTitle: string) => void;
    onTriggerDelete: (chatId: string) => void;
    onCloseMobileMenu: () => void;
    handleShareChat: (chatId: string) => void;
}

const ChatListItem = React.memo(({
    chat,
    currentChatId,
    isAuthenticated,
    isMobile,
    generatingTitles,
    onSwitchChat,
    onTriggerRename,
    onTriggerDelete,
    onCloseMobileMenu,
    handleShareChat
}: ChatListItemProps) => {
    const { authenticated, login } = usePrivy();
    const handleClick = useCallback(() => {
        onSwitchChat(chat.id);
        if (isMobile) onCloseMobileMenu();
    }, [chat.id, isMobile, onSwitchChat, onCloseMobileMenu]);

    const handleRenameClick = useCallback<React.MouseEventHandler<HTMLButtonElement>>((event) => {
        event.preventDefault();
        event.stopPropagation();
        onTriggerRename(chat.id, chat.title);
    }, [chat.id, chat.title, onTriggerRename]);

    const handleShareClick = useCallback<React.MouseEventHandler<HTMLButtonElement>>((event) => {
        event.preventDefault();
        event.stopPropagation();
        handleShareChat(chat.id);
    }, [chat.id, handleShareChat]);

    const handleDeleteClick = useCallback<React.MouseEventHandler<HTMLButtonElement>>((event) => {
        event.preventDefault();
        event.stopPropagation();
        onTriggerDelete(chat.id);
    }, [chat.id, onTriggerDelete]);

    const handleRenameSelect = useCallback(() => {
        if (!authenticated) {
            login();
        } else {
            onTriggerRename(chat.id, chat.title);
        }
    }, [authenticated, login, chat.id, chat.title, onTriggerRename]);

    const handleShareSelect = useCallback(() => {
        if (!authenticated) {
            login();
        } else {
            handleShareChat(chat.id);
        }
    }, [authenticated, login, chat.id, handleShareChat]);

    const handleDeleteSelect = useCallback(() => {
        if (!authenticated) {
            login();
        } else {
            onTriggerDelete(chat.id);
        }
    }, [authenticated, login, chat.id, onTriggerDelete]);

    return (
        <ContextMenu.Root>
            <ContextMenu.Trigger className="w-full">
                <div
                    className={`relative group px-3 py-2.5 md:px-4 md:py-3 rounded-lg cursor-pointer flex items-center transition-colors duration-150 ${chat.id === currentChatId ? 'bg-accent shadow-sm' : 'hover:bg-accent/50'}`}
                    onClick={handleClick}
                >
                    <div className="flex-1 min-w-0 mr-2">
                        <TooltipProvider delayDuration={300}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className={`block text-xs md:text-sm ${chat.id === currentChatId ? 'font-semibold text-accent-foreground' : 'text-foreground'} overflow-hidden text-ellipsis whitespace-nowrap`}>
                                        {generatingTitles.has(chat.id) ? (
                                            <span className="flex items-center gap-2">
                                                <span className="animate-pulse">Generating title...</span>
                                            </span>
                                        ) : (
                                            ((): string => { const max = isMobile ? 20 : 15; return chat.title.length > max ? `${chat.title.slice(0, max)}...` : chat.title; })()
                                        )}
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-[250px] break-words" sideOffset={5}>
                                    {generatingTitles.has(chat.id) ? "Generating title..." : chat.title}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <span className="text-xs text-muted-foreground truncate block mt-0.5">
                            {new Date(chat.updatedAt).toLocaleDateString()} · {chat.messages.length} msg
                        </span>
                    </div>
                    <div className={`flex items-center shrink-0 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                        <AuthenticatedActionButton
                            variant="ghost" size="icon" className={`h-6 w-6 text-muted-foreground hover:text-primary`}
                            onClick={handleRenameClick}
                            title="Rename chat"
                        ><Pencil className="h-3.5 w-3.5" /></AuthenticatedActionButton>
                        <AuthenticatedActionButton
                            variant="ghost" size="icon" className={`h-6 w-6 text-muted-foreground hover:text-primary`}
                            onClick={handleShareClick}
                            title="Share chat"
                        ><ExternalLink className="h-3.5 w-3.5" /></AuthenticatedActionButton>
                        <AuthenticatedActionButton
                            variant="ghost" size="icon" className={`h-6 w-6 text-muted-foreground hover:text-destructive`}
                            onClick={handleDeleteClick}
                            title="Delete chat"
                        ><Trash2 className="h-3.5 w-3.5" /></AuthenticatedActionButton>
                    </div>
                </div>
            </ContextMenu.Trigger>
            <ContextMenu.Content className="min-w-[160px] bg-popover text-popover-foreground rounded-md border shadow-md p-1 z-50">
                <ContextMenu.Item className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent focus:bg-accent hover:text-accent-foreground focus:text-accent-foreground" onSelect={handleRenameSelect}>Rename</ContextMenu.Item>
                <ContextMenu.Item className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent focus:bg-accent hover:text-accent-foreground focus:text-accent-foreground" onSelect={handleShareSelect}>Share</ContextMenu.Item>
                <ContextMenu.Separator className="h-[1px] bg-border m-[5px]" />
                <ContextMenu.Item className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-destructive focus:bg-destructive hover:text-destructive-foreground focus:text-destructive-foreground" onSelect={handleDeleteSelect}>Delete</ContextMenu.Item>
            </ContextMenu.Content>
        </ContextMenu.Root>
    );
});

ChatListItem.displayName = 'ChatListItem';

export interface ChatSidebarProps {
    isMobile: boolean;
    showMobileMenu: boolean;
    isInitializing: boolean;
    isAuthenticated: boolean;
    savedChats: SavedChat[];
    currentChatId: string | null;
    currentSpace: string | null;
    generatingTitles: Set<string>;
    onSwitchChat: (chatId: string) => void;
    onNewChat: () => void;
    onTriggerDeleteAll: () => void;
    onTriggerRename: (chatId: string, currentTitle: string) => void;
    onTriggerDelete: (chatId: string) => void;
    onCloseMobileMenu: () => void;
}

export const ChatSidebar = React.memo(({
    isMobile,
    showMobileMenu,
    isInitializing,
    isAuthenticated,
    savedChats,
    currentChatId,
    currentSpace,
    generatingTitles,
    onSwitchChat,
    onNewChat,
    onTriggerDeleteAll,
    onTriggerRename,
    onTriggerDelete,
    onCloseMobileMenu,
}: ChatSidebarProps) => {
    const [collapsed, setCollapsed] = useState(false);

    // Disable collapse on mobile
    useEffect(() => {
        if (isMobile && collapsed) {
            setCollapsed(false);
        }
    }, [isMobile, collapsed]);

    useEffect(() => {
        if (isMobile) {
            document.documentElement.style.setProperty('--sidebar-width', '0px');
        } else {
            const width = collapsed ? '3rem' : '18rem';
            document.documentElement.style.setProperty('--sidebar-width', width);
        }
    }, [collapsed, isMobile]);

    const handleShareChat = useCallback((chatId: string) => {
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
    }, [currentSpace, isAuthenticated]);

    if (collapsed && !isMobile) {
        return (
            <div className="fixed top-[var(--header-height)] left-0 h-16 w-12 bg-background border-r z-50 flex items-center justify-center">
                <Button variant="ghost" size="icon" onClick={() => setCollapsed(false)} className="rounded-full h-8 w-8">
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        );
    }

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
                        <AuthenticatedActionButton
                            variant="ghost"
                            size="icon"
                            onClick={onNewChat}
                            title="New Chat"
                            className="rounded-full h-8 w-8"
                        >
                            <Plus className="h-4 w-4" />
                        </AuthenticatedActionButton>
                        {!isMobile && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setCollapsed(true)}
                                            className="hidden md:inline-flex rounded-full h-8 w-8 text-muted-foreground hover:bg-accent"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                        Collapse Sidebar
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        {isMobile && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onCloseMobileMenu}
                                className="rounded-full h-8 w-8"
                            >
                                <X className="h-4 w-4" />
                            </Button>
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
                                <ChatListItem
                                    key={chat.id}
                                    chat={chat}
                                    currentChatId={currentChatId}
                                    isAuthenticated={isAuthenticated}
                                    isMobile={isMobile}
                                    generatingTitles={generatingTitles}
                                    onSwitchChat={onSwitchChat}
                                    onTriggerRename={onTriggerRename}
                                    onTriggerDelete={onTriggerDelete}
                                    onCloseMobileMenu={onCloseMobileMenu}
                                    handleShareChat={handleShareChat}
                                />
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </div>
        </div>
    );
});

ChatSidebar.displayName = 'ChatSidebar'; 