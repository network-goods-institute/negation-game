"use client";

import { useState } from "react";
import { useNotifications } from "@/queries/notifications/useNotifications";
import { useMarkAllNotificationsRead, useMarkNotificationRead } from "@/mutations/notifications/useMarkNotificationsRead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BellIcon, CheckIcon, Loader2Icon, ArrowLeftIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAssignments } from "@/components/assignments/UserAssignments";
import { CollapsibleCardDeck, CardDeckControls } from "@/components/ui/collapsible-card-deck";
import { 
  groupNotificationsByType, 
  groupNotificationsByTime, 
  groupNotificationsBySpace 
} from "@/utils/notificationGrouping";

export const NotificationsPage = () => {
    const { data: notifications = [], isLoading, error } = useNotifications();
    const markAllMutation = useMarkAllNotificationsRead();
    const markReadMutation = useMarkNotificationRead();
    const router = useRouter();
    const { ready, authenticated } = usePrivy();
    
    const [groupingMode, setGroupingMode] = useState<'type' | 'time' | 'space' | 'readStatus'>('type');
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    const unreadNotifications = notifications.filter(n => !n.readAt);
    const readNotifications = notifications.filter(n => n.readAt);

    const getNotificationGroups = () => {
        switch (groupingMode) {
            case 'type':
                return groupNotificationsByType(notifications);
            case 'time':
                return groupNotificationsByTime(notifications);
            case 'space':
                return groupNotificationsBySpace(notifications);
            case 'readStatus':
            default:
                return [
                    ...(unreadNotifications.length > 0 ? [{
                        id: 'unread',
                        title: 'Unread',
                        description: 'Notifications you haven\'t read yet',
                        count: unreadNotifications.length,
                        unreadCount: unreadNotifications.length,
                        icon: '🔴',
                        items: unreadNotifications,
                        priority: 1,
                    }] : []),
                    ...(readNotifications.length > 0 ? [{
                        id: 'read',
                        title: 'Read',
                        description: 'Notifications you\'ve already read',
                        count: readNotifications.length,
                        unreadCount: 0,
                        icon: '✅',
                        items: readNotifications,
                        priority: 2,
                    }] : []),
                ];
        }
    };

    const notificationGroups = getNotificationGroups();

    const handleExpandAll = () => {
        setExpandedGroups(new Set(notificationGroups.map(g => g.id)));
    };

    const handleCollapseAll = () => {
        setExpandedGroups(new Set());
    };

    const handleGroupingChange = (grouping: string) => {
        setGroupingMode(grouping as 'type' | 'time' | 'space' | 'readStatus');
    };

    const groupingOptions = [
        { value: 'type', label: 'By Type' },
        { value: 'time', label: 'By Time' },
        { value: 'space', label: 'By Space' },
        { value: 'readStatus', label: 'By Read Status' },
    ];

    const handleMarkAllRead = () => {
        if (unreadNotifications.length === 0) return;
        markAllMutation.mutate();
    };

    const handleMarkRead = (notificationId: string) => {
        markReadMutation.mutate(notificationId);
    };

    // Show loading while checking authentication or loading notifications
    if (!ready || isLoading) {
        return (
            <div className="container max-w-4xl mx-auto p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.back()}
                        className="mr-2"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                    </Button>
                    <BellIcon className="w-6 h-6" />
                    <h1 className="text-2xl font-bold">Notifications</h1>
                </div>
                <div className="flex flex-col space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="p-4 border rounded-lg bg-card space-y-3">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center space-x-3 flex-1">
                                    <Skeleton className="h-4 w-4 rounded-full" />
                                    <Skeleton className="h-4 w-48" />
                                    <Skeleton className="h-2 w-2 rounded-full" />
                                </div>
                                <Skeleton className="h-8 w-8 rounded" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-5/6" />
                            </div>
                            <div className="flex items-center space-x-2">
                                <Skeleton className="h-3 w-24" />
                                <Skeleton className="h-3 w-3" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Show message for unauthenticated users
    if (!authenticated) {
        return (
            <div className="container max-w-4xl mx-auto p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.back()}
                        className="mr-2"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                    </Button>
                    <BellIcon className="w-6 h-6" />
                    <h1 className="text-2xl font-bold">Notifications</h1>
                </div>
                <Card>
                    <CardContent className="text-center py-12">
                        <BellIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">Sign in to view notifications</h3>
                        <p className="text-muted-foreground">
                            You need to sign in to access your notifications
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container max-w-4xl mx-auto p-6">
                <div className="text-center h-64 flex items-center justify-center">
                    <div>
                        <h2 className="text-xl font-semibold mb-2">Failed to load notifications</h2>
                        <p className="text-muted-foreground">Please try refreshing the page</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container max-w-4xl mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.back()}
                        className="mr-2"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                    </Button>
                    <BellIcon className="w-6 h-6" />
                    <h1 className="text-2xl font-bold">Notifications</h1>
                    {unreadNotifications.length > 0 && (
                        <Badge variant="destructive">
                            {unreadNotifications.length} unread
                        </Badge>
                    )}
                </div>

                {unreadNotifications.length > 0 && (
                    <Button
                        onClick={handleMarkAllRead}
                        disabled={markAllMutation.isPending}
                        variant="outline"
                        size="sm"
                    >
                        {markAllMutation.isPending ? (
                            <Loader2Icon className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                            <CheckIcon className="w-4 h-4 mr-2" />
                        )}
                        Mark all read
                    </Button>
                )}
            </div>

            <div className="mb-6">
                <UserAssignments />
            </div>

            {notifications.length === 0 ? (
                <Card>
                    <CardContent className="text-center py-12">
                        <BellIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">No notifications yet</h3>
                        <p className="text-muted-foreground">
                            You&apos;ll receive notifications when others interact with your content
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    <CardDeckControls
                        groups={notificationGroups}
                        expandedGroups={expandedGroups}
                        onExpandAll={handleExpandAll}
                        onCollapseAll={handleCollapseAll}
                        onGroupingChange={handleGroupingChange}
                        currentGrouping={groupingMode}
                        groupingOptions={groupingOptions}
                    />
                    
                    <CollapsibleCardDeck
                        groups={notificationGroups}
                        renderItem={(notification) => (
                            <NotificationCard
                                notification={notification}
                                onMarkRead={handleMarkRead}
                            />
                        )}
                        emptyMessage="No notifications to display"
                        showGroupStats={true}
                        expandedGroups={expandedGroups}
                        onExpandedChange={setExpandedGroups}
                    />
                </div>
            )}
        </div>
    );
};

interface NotificationCardProps {
    notification: any;
    onMarkRead: (id: string) => void;
}

const NotificationCard = ({ notification, onMarkRead }: NotificationCardProps) => {
    const isUnread = !notification.readAt;

    return (
        <div className={`p-3 border rounded-lg transition-colors ${
            isUnread ? 'border-primary/50 bg-primary/5' : 'border-border'
        }`}>
            <div className="flex items-start justify-between">
                <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                        {isUnread && (
                            <Badge variant="destructive" className="h-2 w-2 p-0 rounded-full" />
                        )}
                    </div>

                    {notification.content && (
                        <p className="text-xs text-muted-foreground">{notification.content}</p>
                    )}

                    {notification.aiSummary && (
                        <div className="mt-2 p-2 bg-muted/50 rounded-md border-l-2 border-primary/20">
                            <p className="text-xs font-medium text-primary mb-1">AI Summary</p>
                            <p className="text-xs text-muted-foreground">{notification.aiSummary}</p>
                        </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {notification.sourceUser && (
                            <span>by {notification.sourceUser.username}</span>
                        )}
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span>
                    </div>
                </div>

                {isUnread && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onMarkRead(notification.id)}
                        className="ml-2 h-6 w-6 p-0"
                    >
                        <CheckIcon className="w-3 h-3" />
                    </Button>
                )}
            </div>
        </div>
    );
}; 